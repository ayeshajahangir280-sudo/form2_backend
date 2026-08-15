const express = require("express");
const mongoose = require("mongoose");

const { connectDB } = require("../config/db");
const { uploadBuffer } = require("../config/cloudinary");
const upload = require("../middleware/upload");
const Registration = require("../models/Registration");

const router = express.Router();

const phoneRegex = /^(\+9715\d{8}|\d{10})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const jerseySizes = new Set(["Small", "Medium", "Large", "XL", "XXL", "3XL", "4XL"]);
const sleeveOptions = new Set(["Full Sleeves", "Half Sleeves"]);
const availabilityOptions = new Set(["Available all matches", "Missing few matches"]);
const franchiseInterestOptions = new Set([
  "Yes, I am interested.",
  "No, I am not interested.",
]);
const matchOptions = new Set([
  "20 Aug 2026 — 21:00",
  "23 Aug 2026 — 07:30",
  "25 Aug 2026 — 21:00",
  "30 Aug 2026 — 07:30",
  "01 Sep 2026 — 21:00",
  "03 Sep 2026 — 21:00",
  "06 Sep 2026 — 07:30",
]);

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value) {
  const phone = asString(value);
  if (/^\+9715\d{8}$/.test(phone)) return `0${phone.slice(4)}`;
  return phone;
}

function equivalentPhoneValues(value) {
  const normalized = normalizePhone(value);
  if (/^05\d{8}$/.test(normalized)) return [normalized, `+971${normalized.slice(1)}`];
  return [normalized];
}

function duplicateResponse(res, field) {
  const label = field === "email" ? "email address" : "mobile number";
  return res.status(409).json({
    ok: false,
    message: `A registration with this ${label} already exists. Please use a different ${label}.`,
    errors: { [field]: `This ${label} is already registered.` },
  });
}

function validateRegistration(body, file) {
  const errors = {};
  const values = {
    firstName: asString(body.firstName),
    lastName: asString(body.lastName),
    mobile: normalizePhone(body.mobile),
    email: asString(body.email).toLowerCase(),
    whatsappNumber: normalizePhone(body.whatsappNumber),
    jerseyName: asString(body.jerseyName),
    jerseyNumber: asString(body.jerseyNumber),
    jerseySize: asString(body.jerseySize),
    preferredSleeves: asString(body.preferredSleeves),
    currentClub: asString(body.currentClub),
    availability: asString(body.availability),
    notAvailableOn: asArray(body.notAvailableOn),
    franchiseInterest: asString(body.franchiseInterest),
    feeAgreement: body.feeAgreement === true || body.feeAgreement === "true",
  };

  if (!values.firstName || values.firstName.length > 80) errors.firstName = "First name is required";
  if (!values.lastName || values.lastName.length > 80) errors.lastName = "Last name is required";
  if (!phoneRegex.test(values.mobile)) errors.mobile = "Use 10 digits or UAE format +9715XXXXXXXX";
  if (!emailRegex.test(values.email) || values.email.length > 255) errors.email = "Enter a valid email address";
  if (!phoneRegex.test(values.whatsappNumber)) errors.whatsappNumber = "Use 10 digits or UAE format +9715XXXXXXXX";
  if (!values.jerseyName || values.jerseyName.length > 80) errors.jerseyName = "Name of jersey is required";
  if (!/^\d{1,3}$/.test(values.jerseyNumber)) errors.jerseyNumber = "Jersey number must be whole numbers only";
  if (!jerseySizes.has(values.jerseySize)) errors.jerseySize = "Select a jersey size";
  if (!sleeveOptions.has(values.preferredSleeves)) errors.preferredSleeves = "Select preferred sleeves";
  if (values.currentClub && values.currentClub.length > 120) {
    errors.currentClub = "Current club/team must be 120 characters or fewer";
  }
  if (!availabilityOptions.has(values.availability)) errors.availability = "Select availability";
  if (values.availability === "Missing few matches" && values.notAvailableOn.length === 0) {
    errors.notAvailableOn = "Select at least one match you are not available on";
  }
  if (values.notAvailableOn.some((match) => !matchOptions.has(match))) {
    errors.notAvailableOn = "Select only matches from the Indoor Community League 1.0 schedule";
  }
  if (!franchiseInterestOptions.has(values.franchiseInterest)) {
    errors.franchiseInterest = "Select whether you are interested in owning a team franchise";
  }
  if (!values.feeAgreement) errors.feeAgreement = "You must agree to the registration and match fees";
  if (!file) errors.photo = "Upload a clear headshot photo under 2 MB";

  return { errors, values };
}

function mapRegistration(registration) {
  const id = registration.id || registration._id?.toString();
  const photoUrl =
    registration.photoStorage === "cloudinary"
      ? registration.photoUrl
      : `/api/registrations/${id}/photo`;

  return {
    id,
    firstName: registration.firstName,
    lastName: registration.lastName,
    fullName: registration.fullName,
    email: registration.email,
    mobile: registration.mobile,
    whatsappNumber: registration.whatsappNumber,
    jerseyName: registration.jerseyName,
    jerseyNumber: registration.jerseyNumber,
    jerseySize: registration.jerseySize,
    preferredSleeves: registration.preferredSleeves,
    currentClub: registration.currentClub,
    availability: registration.availability,
    notAvailableOn: registration.notAvailableOn,
    franchiseInterest: registration.franchiseInterest,
    feeAgreement: registration.feeAgreement,
    photoPath: photoUrl,
    photoUrl,
    createdAt: registration.createdAt,
  };
}

router.get("/", async (_req, res, next) => {
  try {
    await connectDB();
    const registrations = await Registration.find()
      .sort({ createdAt: -1 })
      .select(
        "firstName lastName fullName email mobile whatsappNumber jerseyName jerseyNumber jerseySize preferredSleeves currentClub availability notAvailableOn franchiseInterest feeAgreement photoUrl photoStorage createdAt",
      )
      .limit(500)
      .lean({ virtuals: true });

    res.json({
      ok: true,
      registrations: registrations.map(mapRegistration),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/photo", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ ok: false, message: "Photo not found" });
    }

    await connectDB();
    const registration = await Registration.findById(req.params.id)
      .select("photoUrl photoPath photoStorage")
      .lean();

    if (!registration?.photoUrl && !registration?.photoPath) {
      return res.status(404).json({ ok: false, message: "Photo not found" });
    }

    const photo = registration.photoUrl || registration.photoPath;
    if (/^https?:\/\//i.test(photo)) {
      return res.redirect(302, photo);
    }

    const match = /^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/i.exec(photo);
    if (!match) {
      return res.status(404).json({ ok: false, message: "Photo not found" });
    }

    res.setHeader("Content-Type", match[1].replace("image/jpg", "image/jpeg"));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(Buffer.from(match[2], "base64"));
  } catch (error) {
    return next(error);
  }
});

router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    const { errors, values } = validateRegistration(req.body, req.file);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        message: "Please fix the highlighted fields",
        errors,
      });
    }

    await connectDB();

    // Give a field-specific response before uploading the photo. Unique indexes
    // on email and mobile provide the final guard against simultaneous requests.
    const existingRegistration = await Registration.findOne({
      $or: [
        { email: values.email },
        { mobile: { $in: equivalentPhoneValues(values.mobile) } },
      ],
    }).lean();

    if (existingRegistration) {
      return duplicateResponse(
        res,
        existingRegistration.email === values.email ? "email" : "mobile",
      );
    }

    const uploadPublicId = `${Date.now()}-${values.firstName}-${values.lastName}`.replace(
      /[^a-z0-9-]/gi,
      "-",
    );
    const uploadResult = await uploadBuffer(req.file.buffer, { public_id: uploadPublicId });

    const photoUrl =
      uploadResult?.secure_url ||
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const photoPath = uploadResult?.public_id || photoUrl;

    const registration = await Registration.create({
      ...values,
      normalizedEmail: values.email,
      normalizedMobile: values.mobile,
      fullName: `${values.firstName} ${values.lastName}`,
      photoPath,
      photoUrl,
      photoStorage: uploadResult ? "cloudinary" : "mongodb",
      cloudinaryPublicId: uploadResult?.public_id || null,
    });

    return res.status(201).json({
      ok: true,
      message: "Registration submitted successfully.",
      registration: mapRegistration(registration),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.prototype.hasOwnProperty.call(
        error.keyPattern || {},
        "normalizedEmail",
      )
        ? "email"
        : "mobile";
      return duplicateResponse(res, duplicateField);
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        ok: false,
        message: "Please fix the highlighted fields",
        errors: Object.fromEntries(
          Object.entries(error.errors).map(([key, value]) => [key, value.message]),
        ),
      });
    }

    return next(error);
  }
});

module.exports = router;
