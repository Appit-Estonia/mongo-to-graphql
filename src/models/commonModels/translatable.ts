import { prop } from "@typegoose/typegoose";
import { InnerBase } from "./base";

export class Translatable extends InnerBase {

  @prop({ required: true })
  public key!: string;
  
  @prop()
  public en?: string;
  
  @prop()
  public et?: string;
}
