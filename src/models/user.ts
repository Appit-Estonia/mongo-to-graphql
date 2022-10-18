import { prop, plugin, Ref } from "@typegoose/typegoose";
import { updateIfCurrentPlugin } from "mongoose-update-if-current";
import { Auth } from "./auth";
import { Base } from "./commonModels/base";

export interface ITableSettings {
  name: string;
  columnSettings?: IColumnSettings[];
}

export interface IColumnSettings {
  key: string;
  visible?: boolean;
  order?: number;
  width?: number;
}

class TableSettings implements ITableSettings {

  @prop({ required: true })
  public name!: string;

  @prop({ type: () => [ColumnSettings] })
  public columnSettings?: ColumnSettings[];
}

class ColumnSettings implements IColumnSettings {

  @prop({ type: String, required: true })
  public key!: string;

  @prop({ type: Boolean, default: true })
  public visible?: boolean;

  @prop({ type: Number })
  public order?: number;

  @prop({ type: Number })
  public width?: number;
}

@plugin(updateIfCurrentPlugin)
export class User extends Base {

  @prop({ required: true, unique: true, ref: () => Auth })
  public accountId!: Ref<Auth>;

  @prop({ required: true })
  public email!: string;

  @prop()
  public phone?: number;

  @prop()
  public countryCode?: string;

  @prop()
  public firstName?: string;
  
  @prop()
  public lastName?: string;

  @prop()
  public birthday?: string;

  @prop({ enum: ["male", "female"], addNullToEnum: true })
  public gender?: string;

  @prop({ type: () => String })
  public organisations?: string[];

  @prop({ enum: ["en", "et"], default: "en" })
  public language?: string;

  @prop({ type: () => [TableSettings] })
  public tableSettings?: TableSettings[];
}
