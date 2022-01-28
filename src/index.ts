import * as admin from "firebase-admin";
import * as fs from "fs";
require("dotenv").config();
//should be integrated with cloud functions: do firebase init in fresh project and follow  https://medium.com/litslink/firebase-admin-sdk-basics-in-examples-ee7e009a1116

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.PROJECT_ID,
    privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.CLIENT_EMAIL,
  }),
  databaseURL: process.env.DATABASE_URL,
});
function exportCollection(collection: string) {
  //at the moment no , allowed!!
  let txt = "question_text,input_rule,hint,options";
  admin
    .firestore()
    .collection(collection)
    .orderBy("step", "asc")
    .get()
    .then((query) => {
      query.forEach((doc) => {
        txt += "\n";
        txt += doc.data().question_text;
        txt += ",";
        txt += doc.data().input_rule;
        txt += ",";
        txt += doc.data().variable;
        txt += ",";
        txt += doc.data().hint;
        txt += ",";
        txt += doc.data().options?.toString().replaceAll(",", ";");
      });
      fs.writeFileSync(`questions/${collection}.csv`, txt);
    });
}
async function importCollection(collection: string, doc: string) {
  //use this to read in collection
  //console.log(collection)
  const csv = fs.readFileSync(`${collection}/${doc}.csv`).toString();
  const rows = csv.replaceAll("\n", "").split("\r");
  const header = rows.shift();
  console.log(header)
  await rows.forEach(async (row, index) => {
    if (row != "") {
      const values = row.split(/(?<!\\),/g);
      console.log(values)
      let object = "{";
      header!.split(",").forEach((key, attIndex) => {
        const value =
          attIndex >= values.length || values[attIndex] == "undefined"
            ? "null"
            : "\"" + values[attIndex].replaceAll("\\,", ',') + "\""
        object += '"' + key + '":' + value + ",\n";
      });
      object = object.slice(0, object.length - 2);
      object += "}";
      console.log(object)
      //console.log(object)
      const objectJson = JSON.parse(object)
      objectJson.step = index
      // await admin
      //   .firestore()
      //   .collection(collection)
      //   .doc((index + 1).toString())
      //   .set(JSON.parse(object));
      //===== using custom query here ====
      await admin
        .firestore()
        .collection(collection)
        .doc(doc + (index + 1))
        .set(objectJson);
    }
  });
}
let collection = "daos";
let files = fs.readdirSync(collection);
for (const file of files) {
  importCollection(collection, `${file.split(".")[0]}`);
}

//exportCollection('first-quote-questions')
//exportCollection('installer_questions')
//exportCollection('project-detail-questions')
