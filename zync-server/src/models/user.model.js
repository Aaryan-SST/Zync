import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select:    false, // never returned by default queries
    },
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
    toJSON: {
      // Strip password and __v from every serialized response
      transform(_, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password only when the field is modified (creation or explicit update)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Compare a plaintext candidate password against the stored hash.
 * The caller must have fetched the document with .select("+password").
 *
 * @param {string} candidate  - plaintext password from the request body
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
