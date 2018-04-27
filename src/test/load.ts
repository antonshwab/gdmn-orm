import * as fs from "fs";
import {AConnection, AConnectionPool, ADriver, DBStructure, IConnectionOptions} from "gdmn-db";
import {Factory, IDefaultConnectionPoolOptions} from "gdmn-db";
import {ERModel} from "../ermodel";
import {erExport} from "../erexport";

interface IDBDetail<PoolOptions = any, ConnectionOptions extends IConnectionOptions = IConnectionOptions> {
  alias: string;
  driver: ADriver;
  connectionOptions: ConnectionOptions;
  poolOptions: PoolOptions;
  poolInstance: AConnectionPool<PoolOptions>;
}

const test: IDBDetail<IDefaultConnectionPoolOptions> = {
  alias: "test",
  driver: Factory.FBDriver,
  poolInstance: Factory.FBDriver.newDefaultConnectionPool(),
  poolOptions: {
    max: 3
  },
  connectionOptions: {
    host: "localhost",
    port: 3050,
    username: "SYSDBA",
    password: "masterkey",
    path: "c:\\golden\\ns\\gdmn-back\\test\\db\\test.fdb"
  }
};

(async function(dbDetail: IDBDetail) {
  const {driver, poolInstance, poolOptions, connectionOptions}: IDBDetail = dbDetail;
  await poolInstance.create(connectionOptions, poolOptions);

  console.log(JSON.stringify(connectionOptions));
  console.time("Total load time");
  const result = await AConnectionPool.executeConnection(poolInstance,
    (connection) => AConnection.executeTransaction(connection,
      async (transaction) => {
        console.time("DBStructure load time");
        const dbStructure = await driver.readDBStructure(transaction);
        console.log(`DBStructure: ${Object.entries(dbStructure.relations).length} relations loaded...`);
        console.timeEnd("DBStructure load time");
        console.time("erModel load time");
        const erModel = await erExport(dbStructure, transaction, new ERModel());
        console.log(`erModel: loaded ${Object.entries(erModel.entities).length} entities`);
        console.timeEnd("erModel load time");
        return {
          dbStructure,
          erModel
        };
      }));

  if (fs.existsSync("c:/temp/test")) {
    fs.writeFileSync("c:/temp/test/ermodel.json", result.erModel.inspect().reduce( (p, s) => `${p}${s}\n`, ""));
    console.log("ERModel has been written to c:/temp/test/ermodel.json");
  }
})(test);