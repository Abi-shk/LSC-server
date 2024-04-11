import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
    from: { type: mongoose.Types.ObjectId, required: true },
    to: { type: mongoose.Types.ObjectId, required: true },
    message: { type: String, required: true },
    postId: { type: mongoose.Types.ObjectId, required: true },
    postImg: { type: String, required: true },
    status: { type: String, required: true, enum: ["NOTSEEN", "SEEN"], default: "NOTSEEN" }
}, {
    timestamps: true
})

const Notification = mongoose.model("Notification", notificationSchema)

export default Notification;