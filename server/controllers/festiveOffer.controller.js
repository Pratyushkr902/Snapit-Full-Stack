import FestiveOfferModel from "../models/festiveOffer.model.js";

// GET /api/festive-offer/current (Public)
export async function getFestiveOfferController(request, response) {
  try {
    let offer = await FestiveOfferModel.findOne().sort({ createdAt: -1 });
    if (!offer) {
      offer = await FestiveOfferModel.create({});
    }

    return response.json({
      message: "Festive offer retrieved",
      error: false,
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error("getFestiveOfferController error:", error.message);
    return response.status(500).json({
      message: error.message || "Failed to fetch festive offer",
      error: true,
      success: false,
    });
  }
}

// POST /api/festive-offer/update (Super Admin Only)
export async function updateFestiveOfferController(request, response) {
  try {
    const {
      title,
      subtitle,
      bannerImage,
      targetUrl,
      isActive,
      startsAt,
      endsAt,
      minOrderForFreebie,
      freebieName,
      discountPercentage,
    } = request.body;

    let offer = await FestiveOfferModel.findOne().sort({ createdAt: -1 });
    if (!offer) {
      offer = new FestiveOfferModel();
    }

    if (title !== undefined) offer.title = title;
    if (subtitle !== undefined) offer.subtitle = subtitle;
    if (bannerImage !== undefined) offer.bannerImage = bannerImage;
    if (targetUrl !== undefined) offer.targetUrl = targetUrl;
    if (isActive !== undefined) offer.isActive = Boolean(isActive);
    if (startsAt !== undefined) offer.startsAt = new Date(startsAt);
    if (endsAt !== undefined) offer.endsAt = new Date(endsAt);
    if (minOrderForFreebie !== undefined) offer.minOrderForFreebie = Number(minOrderForFreebie);
    if (freebieName !== undefined) offer.freebieName = freebieName;
    if (discountPercentage !== undefined) offer.discountPercentage = Number(discountPercentage);

    await offer.save();

    return response.json({
      message: "Festive offer settings updated successfully! 🎉",
      error: false,
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error("updateFestiveOfferController error:", error.message);
    return response.status(500).json({
      message: error.message || "Failed to update festive offer",
      error: true,
      success: false,
    });
  }
}
