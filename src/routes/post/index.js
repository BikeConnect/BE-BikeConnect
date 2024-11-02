'use strict'

const express = require('express')
const postController = require('../../controllers/post.controller')
const router = express.Router()
const { asyncHandler } = require('../../controllers/authController')
const { checkAuthOwner } = require('../../middlewares/checkAuth')
const { verifyToken } = require('../../middlewares/verifyToken')

router.use(verifyToken)
router.post('', asyncHandler(postController.createPost))
router.patch('/:postId', asyncHandler(postController.updatePost))
router.delete('/:postId', asyncHandler(postController.deletePost))

module.exports = router