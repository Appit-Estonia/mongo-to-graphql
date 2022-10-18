import { plugin, pre, prop } from '@typegoose/typegoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';
import { Base, InnerBase } from './commonModels/base';
import { PasswordManager } from './helpers/passwordManager';


class Account extends InnerBase {

  @prop({ required: true })
  public provider!: string;

  @prop({ required: true })
  public externalId!: string;

  @prop({ required: true })
  public token!: string;
}

@pre<Auth>("save", async function (done) {
  if (this.isModified("password")) {
    const hashed = await PasswordManager.toHash(this.password);
    this.password = hashed;
  }
  done();
})
@plugin(updateIfCurrentPlugin)
export class Auth extends Base {

  @prop()
  public password!: string;

  @prop({ required: true, type: () => Account})
  public connectedAccounts!: Account[];

  @prop({ default: false })
  public isAdmin?: boolean;

  @prop({ default: false })
  public isSuperAdmin?: boolean;

  @prop()
  public resetToken?: string;

  @prop({ default: false })
  public isRestricted?: boolean;

  @prop({ default: false })
  public isValidated?: boolean;

  @prop({ enum: ["email", "phone"]})
  public validationMethod!: string;
}
