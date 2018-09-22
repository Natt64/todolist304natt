//express
const express = require('express')
const app = express()
const md5 = require('md5')
const session = require('express-session')
app.use(session({secret: 'nwen304-project-part2', cookie: {maxAge: 60*60*1000}}))

//pg
const Pg = require('pg')
const pgClient = new Pg.Client("postgres://hljfwixkwynrrn:920ab1d6915e942e57bc0f6f69cca224dd6f794d8b33db176fae5b1513b79191@ec2-54-83-29-34.compute-1.amazonaws.com:5432/dem4l87urpps15?ssl=true")
pgClient.connect()
// pgClient.query('select * from "Users"', (err, res) => {
//     if(!err){
//         console.log(res.rows)
//     }
// })



//ejs template
app.set('view engine', 'ejs')
app.set('views', __dirname+'/views')

//body parser
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extend: true}))

//set public folder
app.use(express.static("public"))
//helper
function currentUser(req,res){
    return req.session.currentUser || false
}
function setCurrentUser(req,res, userInfo){
    return req.session.currentUser = userInfo
}
function removeCurrentUser(req,res){
    delete req.session.currentUser
}
//route
app.get('/', (req, res) => {
    if(!currentUser(req,res)){
        return res.redirect('/login')
    }
    res.render('index',{
        username: currentUser(req,res).username
    })

})
app.get('/login', (req,res)=>{
    res.render('login',{
        err:false
    })
})
app.post('/login', async(req,res)=>{
    let {username, password} = req.body
    let {rows}= await pgClient.query('select * from "Users" where username ilike ($1) and password=($2)',
        [username, md5(password)])
    if(rows.length==1){
        setCurrentUser(req,res,rows[0])
        res.redirect('/')
    }
    else{
        res.render('login', {
            err: true
        })
    }

})
app.get('/logout', (req,res) =>{
    removeCurrentUser(req,res)
    res.redirect('/')
})

app.get('/api/task', async(req,res)=>{
    let user = currentUser(req,res)
    if(!user){
        return res.status(401).json({ack:false})
    }
    let tasks = [], max = 0

    try{
        tasks = await pgClient.query('select * from "Todos" where uid = $1 order by id',
            [user.id]
        )

    }
    catch(err){
        return res.json({ack:false})
    }
    try{
        let m = await pgClient.query('select max(id) as maxid from "Todos"')
        if(m && m.rows.length> 0){
            max = m.rows[0]['maxid']
        }
    }
    catch(err){
        return res.json({ack:false})
    }
    res.json({
        ack: true,
        list: tasks.rows,
        last_id: max
    })
})

app.post('/api/newtask', async (req, res) =>{
    if(!currentUser(req,res)){
        return res.status(401).json({ack:false})
    }
    let {id, name, user} = req.body
    console.log('/api/newtask receive: ', id, name, user)

    try{
        let r = await pgClient.query('insert into "Todos" values($1, $2, $3, $4, $5)',
            [id,name,user,true, currentUser(req,res).id]
        )
    }
    catch(err){
        console.log(err)
        return res.json({ack:false})
    }


    res.json({ack: true})
})



app.post('/api/task/:taskid/complete', async (req,res) =>{
    let {taskid} = req.params
    console.log('/api/' + taskid+ 'receive: complete')
    try{
        await pgClient.query(
            'update "Todos" set status = $1 where id = $2',
            ['FALSE', taskid]
        )
    }
    catch (err) {
        return res.json({ack: false})

    }
    res.json({ack: true})
})

app.post('/api/task/:taskid/todo', async (req,res) =>{
    let {taskid} = req.params
    console.log('/api/' + taskid+ 'receive: todo')
    try{
        await pgClient.query(
            'update "Todos" set status = $1 where id = $2',
            ['TRUE', taskid]
        )
    }
    catch (err) {
        return res.json({ack: false})

    }
    res.json({ack: true})
})


app.post('/api/task/:taskid/edit', async (req,res) =>{
    let {taskid} = req.params
    let {name, user} = req.body
    console.log('/api/' + taskid+ '/edit', name, user)
    try{
        await pgClient.query(
            'update "Todos" set name = $1, "user" = $2 where id = $3',
            [name, user, taskid]
        )
    }
    catch (err) {
        return res.json({ack: false})

    }
    res.json({ack: true})
})

app.post('/api/task/:taskid/remove', async (req,res) =>{
    let {taskid} = req.params
    console.log('/api/' + taskid+ '/remove')
    try{
        await pgClient.query(
            'delete from "Todos" where id = $1',
            [taskid]
        )
    }
    catch (err) {
        return res.json({ack: false})

    }
    res.json({ack: true})
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () =>{
    console.log('start!')
})