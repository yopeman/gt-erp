import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
export const ConnectDB=async()=>{
   await  mongoose.connect(process.env.MONGO_URI)
   console.log("datase connected ")

}

export default ConnectDB