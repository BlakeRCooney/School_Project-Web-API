const express = require('express');
const router = express.Router();
const authVerification = require('../middleware/checkAuth')
router.use((req, res, next)=>{ return authVerification(req, res, next) })

router.get("/", (req, res) =>{
    
    res.send(`Main Router Says Herro World! Hello User: ${req.user}`)
})

module.exports = router;
