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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenDetail = exports.getListOfTokensFromCoinGecko = exports.getContract = exports.getDataFromSnapshotAboutSpace = exports.getDataFromSnapshot = void 0;
var { graphql, buildSchema } = require("graphql");
const axios_1 = __importDefault(require("axios"));
var Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/dd5ca4e96de548eb83259e256b1ed72e"));
const fs = __importStar(require("fs"));
function getDataFromSnapshot() {
    const data = fs.readFileSync("data from postman/response.json").toString();
    const object = JSON.parse(data).spaces;
    let keys = Object.keys(object).filter((key) => object[key].network == "1");
    const objectArray = keys.map((key) => {
        return Object.assign(Object.assign({}, object[key]), { id: key });
    });
    const sortedArray = objectArray
        .sort((a, b) => {
        const x = a.followers;
        const y = b.followers;
        return x == undefined && y == undefined
            ? 0
            : x != undefined && y == undefined
                ? 1
                : x == undefined && y != undefined
                    ? -1
                    : x < y
                        ? -1
                        : x > y
                            ? 1
                            : 0;
    })
        .reverse();
    const sortedKeys = sortedArray.map((item) => item.id);
    return sortedKeys;
}
exports.getDataFromSnapshot = getDataFromSnapshot;
function getDataFromSnapshotAboutSpace(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default.post("https://hub.snapshot.org/graphql", {
            query: `query { space(id: "${id}") {
name
network
symbol
avatar
followersCount
}
}`,
            variables: null,
        });
        return resp.data.data.space;
    });
}
exports.getDataFromSnapshotAboutSpace = getDataFromSnapshotAboutSpace;
function getContract(string) {
    return web3.eth.ens.getAddress("1inch.eth"); //resolver not defined mmh
}
exports.getContract = getContract;
function getListOfTokensFromCoinGecko() {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield axios_1.default.get("https://api.coingecko.com/api/v3/coins/list");
        return resp.data;
    });
}
exports.getListOfTokensFromCoinGecko = getListOfTokensFromCoinGecko;
function getTokenDetail(tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => axios_1.default
            .get("https://api.coingecko.com/api/v3/coins/" + tokenId)
            .then((data) => {
            resolve(data);
        })
            .catch((e) => {
            console.log("error");
            console.log(tokenId);
            console.log(e);
            reject();
        }));
    });
}
exports.getTokenDetail = getTokenDetail;
