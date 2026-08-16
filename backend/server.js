const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

// ------------------------------------
// MONGODB SCHEMA
// ------------------------------------

const emergencySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
    },

    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'Critical']
    },

    description: {
      type: String,
      required: true
    },

    latitude: {
      type: Number,
      required: true
    },

    longitude: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'resolved'],
      default: 'pending'
    },

    assignedVolunteer: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
)

const Emergency = mongoose.model(
  'Emergency',
  emergencySchema
)

// ------------------------------------
// MONGODB CONNECTION
// ------------------------------------

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:')
    console.error(error.message)
  })

// ------------------------------------
// HEALTH CHECK
// ------------------------------------

app.get('/', (req, res) => {
  res.json({
    message: 'AidMap backend is running 🚨'
  })
})

// ------------------------------------
// CREATE EMERGENCY
// ------------------------------------

app.post('/api/emergencies', async (req, res) => {
  try {
    const emergency = new Emergency(req.body)

    const savedEmergency = await emergency.save()

    console.log(
      '🚨 New emergency:',
      savedEmergency._id
    )

    res.status(201).json({
      success: true,
      emergency: savedEmergency
    })

  } catch (error) {
    console.error('❌ Error saving emergency:')
    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Failed to save emergency'
    })
  }
})

// ------------------------------------
// GET ALL EMERGENCIES
// ------------------------------------

app.get('/api/emergencies', async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      count: emergencies.length,
      emergencies
    })

  } catch (error) {
    console.error('❌ Error fetching emergencies:')
    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergencies'
    })
  }
})

// ------------------------------------
// ACCEPT EMERGENCY
// ------------------------------------

app.patch(
  '/api/emergencies/:id/accept',
  async (req, res) => {

    try {

      const { id } = req.params
      const { volunteerId } = req.body

      console.log('🙋 Accept request received')
      console.log('Emergency ID:', id)
      console.log('Volunteer ID:', volunteerId)

      // Check volunteer ID
      if (!volunteerId) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer ID is required'
        })
      }

      // Check MongoDB ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid emergency ID'
        })
      }

      // Only accept pending emergencies
      const emergency =
        await Emergency.findOneAndUpdate(
          {
            _id: id,
            status: 'pending'
          },
          {
            $set: {
              status: 'accepted',
              assignedVolunteer: volunteerId
            }
          },
          {
            new: true
          }
        )

      // Emergency was already accepted/resolved
      if (!emergency) {

        return res.status(409).json({
          success: false,
          message:
            'Emergency not found or has already been accepted'
        })
      }

      console.log(
        '🙋 Emergency accepted:',
        emergency._id.toString()
      )

      console.log(
        '👤 Volunteer:',
        volunteerId
      )

      res.json({
        success: true,
        message: 'Emergency accepted successfully',
        emergency
      })

    } catch (error) {

      console.error(
        '❌ Error accepting emergency:'
      )

      console.error(error)

      res.status(500).json({
        success: false,
        message: 'Failed to accept emergency',
        error: error.message
      })
    }
  }
)

// ------------------------------------
// RESOLVE EMERGENCY
// ------------------------------------

app.patch(
  '/api/emergencies/:id/resolve',
  async (req, res) => {

    try {

      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid emergency ID'
        })
      }

      const emergency =
        await Emergency.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'resolved'
            }
          },
          {
            new: true
          }
        )

      if (!emergency) {

        return res.status(404).json({
          success: false,
          message: 'Emergency not found'
        })
      }

      console.log(
        '✅ Emergency resolved:',
        emergency._id.toString()
      )

      res.json({
        success: true,
        message: 'Emergency resolved successfully',
        emergency
      })

    } catch (error) {

      console.error(
        '❌ Error resolving emergency:'
      )

      console.error(error)

      res.status(500).json({
        success: false,
        message: 'Failed to resolve emergency',
        error: error.message
      })
    }
  }
)

// ------------------------------------
// START SERVER
// ------------------------------------

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(
    `🚀 AidMap backend running on http://localhost:${PORT}`
  )
})