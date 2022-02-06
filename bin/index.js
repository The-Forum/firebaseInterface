"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const { performance } = require("perf_hooks");
const updateDAOs_1 = require("./updateDAOs");
require("dotenv").config();
//should be integrated with cloud functions: do firebase init in fresh project and follow  https://medium.com/litslink/firebase-admin-sdk-basics-in-examples-ee7e009a1116
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.PROJECT_ID,
        privateKey: (_a = process.env.PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"),
        clientEmail: process.env.CLIENT_EMAIL,
    }),
    databaseURL: process.env.DATABASE_URL,
});
function exportCollection(collection) {
    //at the moment no , allowed!!
    let txt = "question_text,input_rule,hint,options";
    admin
        .firestore()
        .collection(collection)
        .orderBy("step", "asc")
        .get()
        .then((query) => {
        query.forEach((doc) => {
            var _a;
            txt += "\n";
            txt += doc.data().question_text;
            txt += ",";
            txt += doc.data().input_rule;
            txt += ",";
            txt += doc.data().variable;
            txt += ",";
            txt += doc.data().hint;
            txt += ",";
            txt += (_a = doc
                .data()
                .options) === null || _a === void 0 ? void 0 : _a.toString().replaceAll(",", ";");
        });
        fs.writeFileSync(`questions/${collection}.csv`, txt);
    });
}
function updateDAOs() {
    return __awaiter(this, void 0, void 0, function* () {
        let tokenDataArray = [];
        let time = performance.now();
        yield (0, updateDAOs_1.getListOfTokensFromCoinGecko)().then((tokenList) => __awaiter(this, void 0, void 0, function* () {
            let numberOfCalls = 1;
            let ensAddresses = (0, updateDAOs_1.getDataFromSnapshot)();
            ensAddresses = ensAddresses.slice(0, 500);
            for (const address of ensAddresses) {
                const spaceData = (yield (0, updateDAOs_1.getDataFromSnapshotAboutSpace)(address));
                const token = tokenList.filter((token) => token.symbol.toLowerCase() == spaceData.symbol.toLowerCase())[0];
                if (token) {
                    if (numberOfCalls >= 50) {
                        console.log("here");
                        yield new Promise((resolve) => setTimeout(() => {
                            time = performance.now();
                            numberOfCalls = 0;
                            doCoingeckocall();
                            resolve();
                        }, 61 * 1000 - (performance.now() - time)));
                    }
                    else {
                        yield doCoingeckocall();
                    }
                    function doCoingeckocall() {
                        return __awaiter(this, void 0, void 0, function* () {
                            const tokenData = (yield (0, updateDAOs_1.getTokenDetail)(token.id)).data;
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
                        });
                    }
                }
                else {
                    console.log(spaceData.symbol);
                }
            }
            fs.writeFileSync("daos.csv", JSON.stringify(tokenDataArray));
        }));
    });
}
function importCollection(collection, doc) {
    return __awaiter(this, void 0, void 0, function* () {
        //use this to read in collection
        //console.log(collection)
        const csv = fs.readFileSync(`${collection}/${doc}.csv`).toString();
        const rows = csv.replaceAll("\n", "").split("\r");
        const header = rows.shift();
        console.log(header);
        yield rows.forEach((row, index) => __awaiter(this, void 0, void 0, function* () {
            if (row != "") {
                const values = row.split(/(?<!\\),/g);
                console.log(values);
                let object = "{";
                header.split(",").forEach((key, attIndex) => {
                    const value = attIndex >= values.length || values[attIndex] == "undefined"
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
                yield admin
                    .firestore()
                    .collection(collection)
                    .doc(doc + (index + 1))
                    .set(objectJson);
            }
        }));
    });
}
/*let collection = "daos";
let files = fs.readdirSync(collection);
for (const file of files) {
  importCollection(collection, `${file.split(".")[0]}`);
}*/
updateDAOs();
//exportCollection('first-quote-questions')
//exportCollection('installer_questions')
//exportCollection('project-detail-questions')
