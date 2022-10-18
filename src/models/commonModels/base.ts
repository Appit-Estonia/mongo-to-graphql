import { modelOptions, pre, prop, ReturnModelType } from "@typegoose/typegoose";
import { ObjectId } from "mongoose";


@modelOptions({
  schemaOptions: {
    toJSON: {
      transform(doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
      }
    },
    timestamps: true,
    versionKey: "version"
  },
})
@pre<Base>(["remove"], function () {
  throw new Error("Mongoose remove not allowed on Base class");
})
@pre<Base>(["findOneAndRemove", "deleteOne", "deleteMany"], function () {
  throw new Error("Mongoose remove not allowed on Base class");
})
export class Base {

  @prop()
  public version!: number;

  @prop()
  public deletedAt!: Date;

  public static async delete(this: ReturnModelType<typeof Base>, id: ObjectId) {
    return this.findByIdAndUpdate(id, { deleted: true });
  }
}


@modelOptions({
  schemaOptions: {
    _id: false,
  }
})
export class InnerBase { }
