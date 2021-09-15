const { user } = require("../models");

class SiteController{
    //GET trả về trang home
    index(req, res){
        const user = res.locals.user
        console.log(user)
        res.render('home',{title: "Trang chủ", user})
    }
}

//khởi tạo controller
module.exports = new SiteController;