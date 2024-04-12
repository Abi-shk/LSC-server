import axios from "axios";
import dotenv from "dotenv";
import Users from "../models/userModel.js";
import { compareString, createJWT, hashString } from "../utils/index.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";
dotenv.config();
import { OAuth2Client } from "google-auth-library";


export const register = async (req, res, next) => {
  console.log("errorrrrrrrrrrrrrrr")
  const { firstName, lastName, email, password } = req.body;
  console.log(req.body)

  //validate fileds
  if (!(firstName || lastName || email || password)) {
    console.log("errorrrrrrrrrrrrrrr")
    next("Provide Required Fields!");
    return;
  }

  try {
    const userExist = await Users.findOne({ email });

    if (userExist) {
      console.log("errorrrrrrrrrrrrrrr")
      next("Email Address already exists");
      return;
    }

    const hashedPassword = await hashString(password);

    const user = await Users.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verified: false,
      google: false
    });

    //send email verification to user
    sendVerificationEmail(user, res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  console.log(email, password)
  let response


  try {
    //validation
    if (!email || !password) {
      console.log("errorrrrrrrrrrrrrrr")
      next("Please Provide User Credentials");
      return;
    }

    // find user by email
    const user = await Users.findOne({ email }).select("+password").populate({
      path: "friends",
      select: "firstName lastName location profileUrl -password",
    });
    console.log(user)
    if (!user) {
      console.log("errorrrrrrrrrrrrrrr")
      next("Invalid email or password");

      return;
    }

    if (!user?.verified) {
      next(
        "User email is not verified. Check your email account and verify your email"
      );
      return;
    }

    // compare password
    const isMatch = await compareString(password, user?.password);

    if (!isMatch) {
      next("Invalid email or password");
      return;
    }

    user.password = undefined;

    const token = createJWT(user?._id);
    console.log(process.env.CHAT_ENGINE_PRIVATE_KEY)
    try {
      response = await axios.put(
        "https://api.chatengine.io/users/",
        { username: `${user.firstName} ${user.lastName}`, secret: email, email: email },
        { headers: { "Private-Key": process.env.CHAT_ENGINE_PRIVATE_KEY } }
      );
      console.log(response)
    } catch (e) {
      console.log(e)
      return res.status(500).json(e.response.data);
    }

    res.status(201).json({
      success: true,
      message: "Login successfully",
      user,
      token,
      chat: response.data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};






export const googleAuth = async (req, res) => {
  const token = req.body.credential
  console.log(token)
  const client = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT_ID, process.env.GOOGLE_AUTH_CLIENT_SECRET, process.env.APP_URL)
  console.log(client)
  let userData
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (payload.iss !== 'https://accounts.google.com' || payload.aud !== process.env.GOOGLE_AUTH_CLIENT_ID) {
      throw new Error('Invalid Google ID token');
    }
    userData = payload
  }
  catch (err) {
    res.status(400).json({ message: "Error verifying Google Id", err });
  }


  if (!userData) {
    res.status(400).json({ message: "Couldn't authorize with google" });
  }

  const { given_name, family_name, email } = userData;

  try {
    const userExist = await Users.findOne({ email, google: true, password: process.env.GOOGLE_USER_PASSWORD });

    if (userExist) {
      const token = createJWT(userExist?._id);
      let response
      try {
        response = await axios.put(
          "https://api.chatengine.io/users/",
          { username: `${userExist.firstName} ${userExist.lastName}`, secret: email, email: email },
          { headers: { "Private-Key": process.env.CHAT_ENGINE_PRIVATE_KEY } }
        );
      } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Failed to create chat account", e })
      }
      return res.status(200).json({
        success: true,
        message: "Login successfully",
        user: userExist,
        token,
        chat: response.data,
      });
    } else {
      const existingUser = await Users.findOne({ email })
      if (existingUser) {
        return res.status(500).json({ message: "An account already exists with this email, try login in with email and password" })
      } else {
        const newUser = new Users({
          firstName: given_name,
          lastName: family_name,
          email,
          password: process.env.GOOGLE_USER_PASSWORD,
          verified: true,
          google: true
        })
        await newUser.save();
        newUser.password = undefined;
        const token = createJWT(newUser?._id);

        let response
        try {
          response = await axios.put(
            "https://api.chatengine.io/users/",
            { username: `${newUser.firstName} ${newUser.lastName}`, secret: email, email: email },
            { headers: { "Private-Key": process.env.CHAT_ENGINE_PRIVATE_KEY } }
          );
        } catch (e) {
          console.log(e)
          return res.status(500).json({ message: "Failed to create chat account", e })

        }

        return res.status(200).json({
          success: true,
          message: "Login successfully",
          user: newUser,
          token,
          chat: response.data,
        })
      }
    }

  }
  catch (err) {
    console.log(err)
    return res.status(500).json({ message: "Internal server error", err })
  }
}  