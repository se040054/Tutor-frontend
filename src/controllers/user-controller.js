const axios = require('axios')

const moment = require('moment')
const instance = axios.create({
  baseURL: `http://localhost:${process.env.API_PORT}/api/`
})

const userController = {
  renderRegister: (req, res) => {
    if (req.session.token) {
      req.flash('error_messages', '尚未登出')
      return res.redirect('/home')
    }
    res.render('user/register')
  },
  renderLogin: (req, res) => {
    if (req.session.token) {
      // 這邊如果設置訊息 會導致google登入時產生錯誤訊息
      return res.redirect('/home')
    }
    res.render('user/login')
  },
  postRegister: (req, res, next) => {
    if (req.session.token) {
      req.flash('error_messages', '尚未登出')
      return res.redirect('/home')
    }
    const { email, password, confirmPassword } = req.body
    if (!email || !password || !confirmPassword) throw new Error('信箱、密碼、確認密碼不能為空')
    if (password !== confirmPassword) throw new Error('密碼不一致')
    return instance.post('/users/register',
      {
        email,
        password,
        confirmPassword
      }
    )
      .then(response => {
        if (response.status === 200) { // 因為res的資料會有一層data api的資料也叫做data 所以兩層
          req.flash('success_messages', '創建帳號成功')
          return res.redirect('/users/login')
        }
      })
      .catch(err => {
        console.log(err)
        return next(err)
      })
  },
  postLogin: (req, res, next) => {
    if (req.session.token) {
      req.flash('error_messages', '尚未登出')
    }
    const { email, password } = req.body
    if (!email || !password) throw new Error('請填寫信箱密碼')
    return instance.post('/users/login',
      {
        email,
        password
      })
      .then(response => {
        if (response.data.data) {
          req.flash('success_messages', '登入成功')
          const { token, user } = response.data.data.data
          req.session.token = token
          req.session.user = user
          return res.redirect('/home')
        } else {
          return res.redirect('/users/login')
        }
      })
      .catch(err => next(err))
  },
  logout: (req, res) => {
    delete req.session.token
    delete req.session.user
    req.flash('success_messages', '已登出')
    return res.redirect('/users/login')
  },
  renderApplyTeacher: (req, res) => {
    if (req.session.user.isTeacher) {
      req.flash('error_messages', '你已經是教師了')
      return res.redirect('back')
    }
    return res.render('user/applyTeacher')
  },
  postApplyTeacher: (req, res, next) => {
    if (req.session.user.isTeacher) {
      req.flash('error_messages', '你已經是教師了')
      return res.redirect('back')
    }
    const { courseIntroduce, courseUrl, teachStyle } = req.body
    if (!courseIntroduce || !courseUrl || !teachStyle) {
      req.flash('error_messages', '有資料未填寫')
      return res.redirect('back')
    }
    instance.post('/users/applyTeacher', {
      courseIntroduce,
      courseUrl,
      teachStyle
    }, { headers: { Authorization: `Bearer ${req.session.token}` } }) // Bearer 跟 token 中間有一個空格
      .then(response => {
        if (response.status === 200) {
          req.flash('success_messages', '已成為教師!')
          return res.redirect('/home')
        }
        req.flash('error_messages', '申請成為教師失敗!')
        return res.redirect('/home')
      })
      .catch(err => next(err))
  },
  renderUser: (req, res, next) => {
    const { id } = req.params
    instance.get(`/users/${id}`, {
      headers: { Authorization: `Bearer ${req.session.token}` }
    }).then(response => {
      const { user, userRanking } = response.data.data
      if (user.id !== req.session.user.id) {
        req.flash('error_messages', '僅能查看自己的頁面')
        return res.redirect('back')
      }

      const Reserves = user.Reserves
      const scheduleReserves =
        Reserves.filter(reserve => moment(reserve.Lesson.daytime).isSameOrAfter(moment()))
      const lessonHistoryReserves =
        Reserves.filter(reserve => moment(reserve.Lesson.daytime).isSameOrBefore(moment()))
      return res.render('user/profile', { user, userRanking, scheduleReserves, lessonHistoryReserves })
    }).catch(err => next(err))
  },
  renderUserEdit: (req, res) => {
    return res.render('user/editProfile')
  },
  putUser: (req, res, next) => {
    const { name, introduction } = req.body
    if (!name || !introduction) {
      req.flash('error_messages', '不能改為空白')
      res.redirect('back')
    }
    return instance.put(`/users/${req.session.user.id}`, {
      name,
      introduction
    }, { headers: { Authorization: `Bearer ${req.session.token}` } })
      .then(response => {
        console.log(response.status)
        if (response.status === 200) {
          req.flash('success_messages', '修改個人資料成功')
          return res.redirect(`/users/${req.session.user.id}`)
        }
      }).catch(err => next(err))
  }
}
module.exports = userController
