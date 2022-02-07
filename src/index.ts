import * as admin from "firebase-admin";
import * as fs from "fs";
import { assertValidExecutionArguments } from "graphql/execution/execute";
const { performance } = require("perf_hooks");
import {
  getContract,
  getDataFromSnapshot,
  getDataFromSnapshotAboutSpace,
  getListOfTokensFromCoinGecko,
  getTokenDetail,
} from "./updateDAOs";
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
        txt += doc
          .data()
          .options?.toString()
          .replaceAll(",", ";");
      });
      fs.writeFileSync(`questions/${collection}.csv`, txt);
    });
}
async function updateDAOs() {
  let tokenDataArray = [] as Object[];
  let time = performance.now();
  await getListOfTokensFromCoinGecko().then(
    async (tokenList: { id: string; symbol: string; name: string }[]) => {
      let numberOfCalls = 1;
      let ensAddresses = getDataFromSnapshot() as string[];
      ensAddresses = ensAddresses.slice(0, 500);
      for (const address of ensAddresses) {
        const spaceData = (await getDataFromSnapshotAboutSpace(address)) as {
          symbol: string;
          name: string;
          followersCount: number;
          avatar: string;
        };
        let possibleTokens = tokenList.filter(
          (token) =>
            token.symbol.toLowerCase() == spaceData.symbol.toLowerCase() ||
            token.name.toLowerCase() == spaceData.name.toLowerCase()
        );
        if (possibleTokens && possibleTokens.length > 0) {
          let token: { id: string; symbol: string; name: string };
          if (possibleTokens.length > 1) {
            token = possibleTokens.filter(
              (possibleToken) =>
                (possibleToken.symbol.toLowerCase() ==
                  spaceData.symbol.toLowerCase() &&
                  (possibleToken.name.toLowerCase() ==
                    spaceData.symbol.toLowerCase() ||
                    possibleToken.symbol.toLowerCase() ==
                      spaceData.name.toLowerCase() ||
                    possibleToken.name.slice(0, 4).toLowerCase() ==
                      spaceData.name.slice(0, 4).toLowerCase())) ||
                (possibleToken.name.toLowerCase() ==
                  spaceData.name.toLowerCase() &&
                  (possibleToken.name.toLowerCase() ==
                    spaceData.symbol.toLowerCase() ||
                    possibleToken.symbol.toLowerCase() ==
                      spaceData.name.toLowerCase() ||
                    possibleToken.symbol.slice(0, 3).toLowerCase() ==
                      spaceData.symbol.slice(0, 3).toLowerCase()))
            )[0];
          } else {
            token = possibleTokens[0];
          }
          if (token) {
            if (numberOfCalls >= 50) {
              console.log("here");
              await new Promise<void>((resolve) =>
                setTimeout(() => {
                  time = performance.now();
                  numberOfCalls = 0;
                  doCoingeckocall();
                  resolve();
                }, 61 * 1000 - (performance.now() - time))
              );
            } else {
              await doCoingeckocall();
            }
            async function doCoingeckocall() {
              const tokenData = ((await getTokenDetail(token.id)) as {
                data: {
                  id: string;
                  symbol: string;
                  name: string;
                  description: { en: string };
                  links: Object;
                  image: { large: string };
                  categories: Object[];
                };
              }).data;
              numberOfCalls += 1;
              //console.log(numberOfCalls); //what is the data we get here?? everything undefined??
              //console.log(tokenData)
              //console.log({ name: tokenData.name, description: tokenData.description.en, links: tokenData.links, image: tokenData.image.large, categories: tokenData.categories })
              tokenDataArray.push({
                id: tokenData.id,
                ensName: address,
                symbol: tokenData.symbol,
                avatar: spaceData.avatar,
                followersCount: spaceData.followersCount,
                name: tokenData.name,
                description: tokenData.description && tokenData.description.en,
                links: tokenData.links,
                image: tokenData.image && tokenData.image.large,
                categories: tokenData.categories,
              });
            }
          } else {
            console.log("Multiple symbols which fit:");
            console.log(address);
          }
        } else {
          console.log("No symbol that fits:");
          console.log(address);
        }
      }
      fs.writeFileSync("daos.csv", JSON.stringify(tokenDataArray!));
    }
  );
}
async function importDAOs() {
  let categories = [] as string[];
  const csv = fs.readFileSync(`daos.csv`).toString();
  const daos = JSON.parse(csv) as { id: string; categories: string[] }[];
  await daos.forEach(async (dao) => {
    categories.push(...dao.categories);
    await admin
      .firestore()
      .collection("daos")
      .doc(dao.id)
      .set(dao);
  });
  categories = [...new Set(categories)];
  console.log(categories);
}
async function importCollection(collection: string, doc: string) {
  //use this to read in collection
  //console.log(collection)
  const csv = fs.readFileSync(`${collection}/${doc}.csv`).toString();
  const rows = csv.replaceAll("\n", "").split("\r");
  const header = rows.shift();
  console.log(header);
  await rows.forEach(async (row, index) => {
    if (row != "") {
      const values = row.split(/(?<!\\),/g);
      console.log(values);
      let object = "{";
      header!.split(",").forEach((key, attIndex) => {
        const value =
          attIndex >= values.length || values[attIndex] == "undefined"
            ? "null"
            : '"' + values[attIndex].replaceAll("\\,", ",") + '"';
        object += '"' + key + '":' + value + ",\n";
      });
      object = object.slice(0, object.length - 2);
      object += "}";
      console.log(object);
      //console.log(object)
      const objectJson = JSON.parse(object);
      objectJson.step = index;
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
/*let collection = "daos";
let files = fs.readdirSync(collection);
for (const file of files) {
  importCollection(collection, `${file.split(".")[0]}`);
}*/
updateDAOs();
importDAOs();
//exportCollection('first-quote-questions')
//exportCollection('installer_questions')
//exportCollection('project-detail-questions')
