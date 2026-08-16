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
    },

    acceptedAt: {
      type: Date,
      default: null
    },

    resolvedAt: {
      type: Date,
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
    console.error(
      '❌ Error fetching emergencies:',
      error
    )

    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergencies'
    })
  }
})

// ------------------------------------
// VOLUNTEER ACCEPTS EMERGENCY
// ------------------------------------

app.patch(
  '/api/emergencies/:id/accept',
  async (req, res) => {

    try {

      const { id } = req.params
      const { volunteerId } = req.body

      if (!volunteerId) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer ID is required'
        })
      }

      // Only allow pending emergencies
      // to be accepted.
      const emergency =
        await Emergency.findOneAndUpdate(
          {
            _id: id,
            status: 'pending'
          },
          {
            status: 'accepted',
            assignedVolunteer: volunteerId,
            acceptedAt: new Date()
          },
          {
            new: true
          }
        )

      if (!emergency) {
        return res.status(409).json({
          success: false,
          message:
            'This emergency has already been accepted or resolved'
        })
      }

      console.log(
        '🙋 Emergency accepted:',
        emergency._id,
        'by',
        volunteerId
      )

      res.json({
        success: true,
        message: 'Emergency accepted successfully',
        emergency
      })

    } catch (error) {

      console.error(
        '❌ Error accepting emergency:',
        error
      )

      res.status(500).json({
        success: false,
        message: 'Failed to accept emergency'
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

      const emergency =
        await Emergency.findOneAndUpdate(
          {
            _id: id,
            status: 'accepted'
          },
          {
            status: 'resolved',
            resolvedAt: new Date()
          },
          {
            new: true
          }
        )

      if (!emergency) {
        return res.status(409).json({
          success: false,
          message:
            'Emergency must be accepted before it can be resolved'
        })
      }

      console.log(
        '✅ Emergency resolved:',
        emergency._id
      )

      res.json({
        success: true,
        message: 'Emergency resolved successfully',
        emergency
      })

    } catch (error) {

      console.error(
        '❌ Error resolving emergency:',
        error
      )

      res.status(500).json({
        success: false,
        message: 'Failed to resolve emergency'
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