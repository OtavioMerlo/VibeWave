const mongoose = require('mongoose');

const ArtistaSchema = mongoose.Schema({
  nome:{
    type:String,
  },
  pais:{
    type:String,
  },
  genero_musical:{
    type:String,
  },
  status:{
    type:String
  },
  biografia:{
    type:String
  },
  foto:{
    type:String
  },
  website:{
    type:String
  },
  datanas:{
    type:Date
  },
  plataforma:{
    type:String
  },
  handle:{
    type:String
  }
})

mongoose.model("artistas",ArtistaSchema)