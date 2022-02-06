var { graphql, buildSchema } = require("graphql");
import axios from "axios";
var Web3 = require("web3");
var web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://mainnet.infura.io/v3/dd5ca4e96de548eb83259e256b1ed72e"
  )
);
import * as fs from "fs";
import { registerEnumType } from "@nestjs/graphql";
import { rejects } from "assert";
import { StringMappingType } from "typescript";

interface space {
  network: string;
}
export function getDataFromSnapshot() {
  const data = fs.readFileSync("data from postman/response.json").toString();
  const object = JSON.parse(data).spaces;
  let keys = Object.keys(object).filter(
    (key) => (object[key as keyof object] as space).network == "1"
  );
  const objectArray = keys.map((key) => {
    return { ...object[key as keyof object], id: key };
  });
  const sortedArray = (objectArray as {
    followers?: number;
    id: string;
  }[])
    .sort((a, b) => {
      const x = a.followers;
      const y = b.followers;
      return x == undefined && y == undefined
        ? 0
        : x != undefined && y == undefined
        ? 1
        : x == undefined && y != undefined
        ? -1
        : x! < y!
        ? -1
        : x! > y!
        ? 1
        : 0;
    })
    .reverse();
  const sortedKeys = sortedArray.map((item) => item.id);
  return sortedKeys;
}
export async function getDataFromSnapshotAboutSpace(id: string) {
  const resp = await axios.post("https://hub.snapshot.org/graphql", {
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
}
export function getContract(string: string) {
  return web3.eth.ens.getAddress("1inch.eth"); //resolver not defined mmh
}

export async function getListOfTokensFromCoinGecko() {
  const resp = await axios.get("https://api.coingecko.com/api/v3/coins/list");
  return resp.data;
}
export async function getTokenDetail(tokenId: string) {
  return new Promise((resolve, reject) =>
    axios
      .get("https://api.coingecko.com/api/v3/coins/" + tokenId)
      .then((data) => {
        resolve(data);
      })
      .catch((e) => {
        console.log("error");
        console.log(tokenId);
        console.log(e);
        reject();
      })
  );
}
