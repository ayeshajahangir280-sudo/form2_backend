const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    fullName: { type: String, required: true, trim: true, maxlength: 170 },
    mobile: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
      index: true,
    },
    normalizedEmail: { type: String, required: true, select: false, unique: true, sparse: true },
    normalizedMobile: { type: String, required: true, select: false, unique: true, sparse: true },
    whatsappNumber: { type: String, required: true, trim: true },
    jerseyName: { type: String, required: true, trim: true, maxlength: 80 },
    jerseyNumber: { type: String, required: true, trim: true },
    jerseySize: {
      type: String,
      required: true,
      enum: ["Small", "Medium", "Large", "XL", "XXL", "3XL", "4XL"],
    },
    preferredSleeves: {
      type: String,
      required: true,
      enum: ["Full Sleeves", "Half Sleeves"],
    },
    currentClub: { type: String, trim: true, maxlength: 120 },
    availability: {
      type: String,
      required: true,
      enum: ["Available all matches", "Missing few matches"],
    },
    notAvailableOn: { type: [String], default: [] },
    franchiseInterest: {
      type: String,
      required: true,
      enum: ["Yes, I am interested.", "No, I am not interested."],
    },
    feeAgreement: { type: Boolean, required: true },
    photoPath: { type: String, default: null },
    photoUrl: { type: String, required: true },
    photoStorage: {
      type: String,
      required: true,
      enum: ["cloudinary", "mongodb"],
      default: "mongodb",
    },
    cloudinaryPublicId: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

module.exports =
  mongoose.models.Registration || mongoose.model("Registration", registrationSchema);
