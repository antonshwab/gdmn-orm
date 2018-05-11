import * as fs from "fs";
import {AConnection, ADriver, Factory, IConnectionOptions} from "gdmn-db";
import {ERModel, SetAttribute} from "../ermodel";
import {erExport} from "../erexport";
import { adjustName } from "../rdbadapter";

interface IDBDetail<ConnectionOptions extends IConnectionOptions = IConnectionOptions> {
  alias: string;
  driver: ADriver;
  options: ConnectionOptions;
}

const testDB: IDBDetail = {
  alias: "test",
  driver: Factory.FBDriver,
  options: {
    host: "localhost",
    port: 3050,
    username: "SYSDBA",
    password: "masterkey",
    path: "c:\\golden\\ns\\gdmn-back\\test\\db\\test.fdb"
  }
};

async function loadERModel(dbDetail: IDBDetail) {
  const {driver, options}: IDBDetail = dbDetail;

  console.log(JSON.stringify(options));
  console.time("Total load time");
  const result = await AConnection.executeConnection({
    connection: driver.newConnection(),
    options,
    callback: (connection) => AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        console.time("DBStructure load time");
        const dbStructure = await driver.readDBStructure(connection, transaction);
        console.log(`DBStructure: ${Object.entries(dbStructure.relations).length} relations loaded...`);
        console.timeEnd("DBStructure load time");
        console.time("erModel load time");
        const erModel = await erExport(dbStructure, connection, transaction, new ERModel());
        console.log(`erModel: loaded ${Object.entries(erModel.entities).length} entities`);
        console.timeEnd("erModel load time");
        return {
          dbStructure,
          erModel
        };
      }
    })
  });

  if (fs.existsSync("c:/temp/test")) {
    fs.writeFileSync("c:/temp/test/ermodel.json", result.erModel.inspect().reduce((p, s) => `${p}${s}\n`, ""));
    console.log("ERModel has been written to c:/temp/test/ermodel.json");
  }

  return result;
}

test("erModel", async () => {
  const result = await loadERModel(testDB);
  const tstTable = result.erModel.entities[adjustName("USR$TST_TABLE")];

  expect(tstTable).toBeDefined();
  expect(tstTable.attribute(adjustName("USR$SET_COMPANY_WF"))).toBeInstanceOf(SetAttribute);
  expect(tstTable.attribute(adjustName("USR$SET_COMPANY_WOF"))).toBeInstanceOf(SetAttribute);
});

