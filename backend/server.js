const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())


// ====================================
// EMERGENCY SCHEMA
// ====================================

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
      enum: [
        'pending',
        'accepted',
        'resolved'
      ],
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


// ====================================
// VOLUNTEER SCHEMA
// ====================================

const volunteerSchema = new mongoose.Schema(
  {
    volunteerId: {
      type: String,
      required: true,
      unique: true
    },

    skills: {
      type: [String],
      enum: [
        'Medical',
        'Transport',
        'Supplies',
        'Shelter'
      ],
      default: []
    },

    available: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)


const Emergency =
  mongoose.model(
    'Emergency',
    emergencySchema
  )


const Volunteer =
  mongoose.model(
    'Volunteer',
    volunteerSchema
  )


// ====================================
// MONGODB CONNECTION
// ====================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {

    console.log(
      '✅ MongoDB connected'
    )

  })
  .catch((error) => {

    console.error(
      '❌ MongoDB connection failed:'
    )

    console.error(
      error.message
    )

  })


// ====================================
// HEALTH CHECK
// ====================================

app.get('/', (req, res) => {

  res.json({
    message:
      'AidMap backend is running 🚨'
  })

})


// ====================================
// CREATE EMERGENCY
// ====================================

app.post(
  '/api/emergencies',
  async (req, res) => {

    try {

      const emergency =
        new Emergency(req.body)


      const savedEmergency =
        await emergency.save()


      console.log(
        '🚨 New emergency:',
        savedEmergency._id
      )


      res.status(201).json({

        success: true,

        emergency:
          savedEmergency

      })

    } catch (error) {

      console.error(
        '❌ Error saving emergency:'
      )

      console.error(error)


      res.status(500).json({

        success: false,

        message:
          'Failed to save emergency'

      })

    }

  }
)


// ====================================
// GET ALL EMERGENCIES
// ====================================

app.get(
  '/api/emergencies',
  async (req, res) => {

    try {

      const emergencies =
        await Emergency
          .find()
          .sort({
            createdAt: -1
          })


      res.json({

        success: true,

        count:
          emergencies.length,

        emergencies

      })

    } catch (error) {

      console.error(
        '❌ Error fetching emergencies:',
        error
      )


      res.status(500).json({

        success: false,

        message:
          'Failed to fetch emergencies'

      })

    }

  }
)


// ====================================
// CREATE / UPDATE VOLUNTEER
// ====================================

app.post(
  '/api/volunteers',
  async (req, res) => {

    try {

      const {
        volunteerId,
        skills,
        available
      } = req.body


      // -------------------------------
      // VALIDATE ID
      // -------------------------------

      if (!volunteerId) {

        return res.status(400).json({

          success: false,

          message:
            'Volunteer ID is required'

        })

      }


      // -------------------------------
      // VALIDATE SKILLS
      // -------------------------------

      const allowedSkills = [
        'Medical',
        'Transport',
        'Supplies',
        'Shelter'
      ]


      const selectedSkills =
        Array.isArray(skills)
          ? skills.filter(
              skill =>
                allowedSkills.includes(
                  skill
                )
            )
          : []


      // -------------------------------
      // UPSERT VOLUNTEER
      // -------------------------------

      const volunteer =
        await Volunteer.findOneAndUpdate(

          {
            volunteerId
          },

          {
            $set: {

              skills:
                selectedSkills,

              available:
                available !== false

            }
          },

          {
            new: true,

            upsert: true,

            setDefaultsOnInsert: true
          }

        )


      console.log(
        '🙋 Volunteer updated:',
        volunteer.volunteerId
      )


      console.log(
        '🛠 Skills:',
        volunteer.skills
      )


      console.log(
        '🟢 Available:',
        volunteer.available
      )


      res.json({

        success: true,

        message:
          'Volunteer profile saved',

        volunteer

      })

    } catch (error) {

      console.error(
        '❌ Error saving volunteer:',
        error
      )


      res.status(500).json({

        success: false,

        message:
          'Failed to save volunteer',

        error:
          error.message

      })

    }

  }
)


// ====================================
// GET VOLUNTEER
// ====================================

app.get(
  '/api/volunteers/:volunteerId',
  async (req, res) => {

    try {

      const {
        volunteerId
      } = req.params


      const volunteer =
        await Volunteer.findOne({
          volunteerId
        })


      if (!volunteer) {

        return res.status(404).json({

          success: false,

          message:
            'Volunteer not found'

        })

      }


      res.json({

        success: true,

        volunteer

      })

    } catch (error) {

      console.error(error)


      res.status(500).json({

        success: false,

        message:
          'Failed to fetch volunteer'

      })

    }

  }
)


// ====================================
// UPDATE VOLUNTEER AVAILABILITY
// ====================================

app.patch(
  '/api/volunteers/:volunteerId/availability',
  async (req, res) => {

    try {

      const {
        volunteerId
      } = req.params

      const {
        available
      } = req.body


      if (
        typeof available !==
        'boolean'
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Available must be true or false'

        })

      }


      const volunteer =
        await Volunteer.findOneAndUpdate(

          {
            volunteerId
          },

          {
            $set: {
              available
            }
          },

          {
            new: true
          }

        )


      if (!volunteer) {

        return res.status(404).json({

          success: false,

          message:
            'Volunteer not found'

        })

      }


      console.log(
        '🟢 Volunteer availability:',
        volunteerId,
        available
      )


      res.json({

        success: true,

        volunteer

      })

    } catch (error) {

      console.error(
        '❌ Error updating availability:',
        error
      )


      res.status(500).json({

        success: false,

        message:
          'Failed to update availability'

      })

    }

  }
)


// ====================================
// ACCEPT EMERGENCY
// ====================================

app.patch(
  '/api/emergencies/:id/accept',
  async (req, res) => {

    try {

      const {
        id
      } = req.params

      const {
        volunteerId
      } = req.body


      console.log(
        '🙋 Accept request received'
      )

      console.log(
        'Emergency ID:',
        id
      )

      console.log(
        'Volunteer ID:',
        volunteerId
      )


      // -------------------------------
      // CHECK VOLUNTEER
      // -------------------------------

      if (!volunteerId) {

        return res.status(400).json({

          success: false,

          message:
            'Volunteer ID is required'

        })

      }


      // -------------------------------
      // CHECK MONGODB ID
      // -------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid emergency ID'

        })

      }


      // -------------------------------
      // CHECK VOLUNTEER EXISTS
      // -------------------------------

      const volunteer =
        await Volunteer.findOne({
          volunteerId
        })


      if (!volunteer) {

        return res.status(404).json({

          success: false,

          message:
            'Volunteer profile not found'

        })

      }


      // -------------------------------
      // CHECK AVAILABILITY
      // -------------------------------

      if (!volunteer.available) {

        return res.status(409).json({

          success: false,

          message:
            'You are currently unavailable'

        })

      }


      // -------------------------------
      // FIND EMERGENCY
      // -------------------------------

      const emergency =
        await Emergency.findOneAndUpdate(

          {
            _id: id,

            status:
              'pending'
          },

          {
            $set: {

              status:
                'accepted',

              assignedVolunteer:
                volunteerId

            }
          },

          {
            new: true
          }

        )


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

        message:
          'Emergency accepted successfully',

        emergency

      })

    } catch (error) {

      console.error(
        '❌ Error accepting emergency:',
        error
      )


      res.status(500).json({

        success: false,

        message:
          'Failed to accept emergency',

        error:
          error.message

      })

    }

  }
)


// ====================================
// RESOLVE EMERGENCY
// ====================================

app.patch(
  '/api/emergencies/:id/resolve',
  async (req, res) => {

    try {

      const {
        id
      } = req.params


      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid emergency ID'

        })

      }


      const emergency =
        await Emergency.findByIdAndUpdate(

          id,

          {
            $set: {
              status:
                'resolved'
            }
          },

          {
            new: true
          }

        )


      if (!emergency) {

        return res.status(404).json({

          success: false,

          message:
            'Emergency not found'

        })

      }


      console.log(
        '✅ Emergency resolved:',
        emergency._id.toString()
      )


      res.json({

        success: true,

        message:
          'Emergency resolved successfully',

        emergency

      })

    } catch (error) {

      console.error(
        '❌ Error resolving emergency:',
        error
      )


      res.status(500).json({

        success: false,

        message:
          'Failed to resolve emergency',

        error:
          error.message

      })

    }

  }
)


// ====================================
// START SERVER
// ====================================

const PORT =
  process.env.PORT || 3000


app.listen(
  PORT,
  () => {

    console.log(
      `🚀 AidMap backend running on http://localhost:${PORT}`
    )

  }
)