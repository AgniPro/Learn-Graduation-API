import mongoose from 'mongoose';

const connectDB = async (DATABASE_URL) => {
  try {
    await mongoose.connect(DATABASE_URL)
    console.log('DB Connected Successfully...')
  } catch (error) {
    console.log(error);
    setTimeout(connectDB, 50000);
  }
}

export default connectDB