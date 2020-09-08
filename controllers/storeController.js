const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');


const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto) {
            next(null, true);
        } else{
            next({message: 'That file type isn\'t allowed'}, false);
        }
    }
}

exports.homePage =  (req, res) => {
    res.render('index');
}

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
}


exports.upload = multer(multerOptions).single('photo');


exports.resize = async (req, res, next) => {
    if(!req.file) return next();

    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
}


exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    await req.flash('success', `Your Store: ${store.name} is sucessfully create !`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', {title: 'Stores', stores});
}

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({slug: req.params.slug});
    if(!store) return next();
    res.render('store', {title: store.name, store});
}

const confirmOwner = (store, user) =>{
    if(!store.author.equals(user._id)){
        throw Error('You must own a store in order to edit it !')
    }
}

exports.editStore = async (req, res) => {
    const store = await Store.findOne({_id: req.params.id}).populate('author');
    confirmOwner(store, req.user);
    res.render('editStore', {title: `Edit ${store.name}`, store})
}

exports.updateStore = async (req, res) => {
    req.body.location.type = "Point";
    const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
        new: true, // return  the new store instead of old one , by default findoneandupdate return the old one
        runValidators: true
    }).exec();
    req.flash('success', `Sucessfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store </a>`)
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoresByTag = async (req, res) => {
    const tagQuery = req.params.tag || { $exists: true};
    const tagsPromise =  Store.getTagsList();
    const storesPromise = Store.find({tags: tagQuery});
    const [tags, stores]  = await Promise.all([tagsPromise, storesPromise]);
    res.render('tags', {tags, title: 'Tags', tag: req.params.tag, stores} );
}

const getDurationInMilliseconds = (start) => {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)

    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}


exports.searchStore = async (req, res) => {
    const stores = await Store.find({
        $text:{
            $search: req.query.q,
        }
    }, {
        score: { $meta: 'textScore'}
    })
    .sort({
        score: {$meta: 'textScore'}
    })
    .limit(5);
    res.json(stores);
}