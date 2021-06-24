const { user } = require("../models");

class SiteController{
    //GET trả về trang home
    index(req, res){
        res.render('home')
    }
}

//khởi tạo controller
module.exports = new SiteController;