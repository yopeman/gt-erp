import express from 'express'
import cors from 'cors'
import ConnectDB from './config/database.js'
import dotenv from 'dotenv'
const PORT=process.env.PORT||5000
ConnectDB()
const app=express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({
    extended:true
}))
app.get('/',(req,res)=>{
    res.send('gt erp server is live...')
})
app.listen(PORT,()=>{
    console.log(`server is runing on the port http://localhost:${PORT}`)
})