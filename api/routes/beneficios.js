import express from 'express'
import { connectToDatabase } from '../utils/mongodb.js'
import { check, validationResult } from 'express-validator'

const router = express.Router()
const { db, ObjectId } = await connectToDatabase()
const nomeCollection = 'beneficios'

const validaBeneficio = [
check('nome')
  .not().isEmpty().trim().withMessage('É obrigatório informar o nome do benefício')
  .isLength({min:5}).withMessage('O nome é muito curto. Mínimo de 5')  
  .isLength({max:200}).withMessage('O nome é muito longo. Máximo de 200'),
check('endereco.logradouro').notEmpty().withMessage('O Logradouro é obrigatório'),
check('endereco.bairro').notEmpty().withMessage('O bairro é obrigatório'),
check('endereco.cidade').notEmpty().withMessage('A localidade é obrigatório'),
check('pontos').isNumeric().withMessage('Os pontos devem ser um número'),
check('data').matches(/^\d{4}-\d{2}-\d{2}$/)
     .withMessage('O formato de data é inválido. Informe yyyy-mm-dd'),
check('quantidade').isNumeric().withMessage('A quantidade deve ser um número'),
]

/**
 * GET /api/beneficios
 * Lista todos os benefícios
 * Parâmetros: limit, skip e order
 */
router.get('/', async (req, res) => {
  const { limit, skip, order } = req.query //Obter da URL
  try {
    const docs = []
    await db.collection(nomeCollection)
      .find()
      .limit(parseInt(limit) || 10)
      .skip(parseInt(skip) || 0)
      .sort({ order: 1 })
      .forEach((doc) => {
        docs.push(doc)
      })
    res.status(200).json(docs)
  } catch (err) {
    res.status(500).json(
      {
        message: 'Erro ao obter a listagem dos benefícios',
        error: `${err.message}`
      })
  }
})

/**
 * GET /api/beneficios/id/:id
 * Lista o benefício pelo id
 * Parâmetros: id
 */
router.get('/id/:id', async (req, res) => {
  try {
    const docs = []
    await db.collection(nomeCollection)
      .find({ '_id': { $eq: new ObjectId(req.params.id) } }, {})
      .forEach((doc) => {
        docs.push(doc)
      })
    res.status(200).json(docs)
  } catch (err) {
    res.status(500).json({
      errors: [{
        value: `${err.message}`,
        msg: 'Erro ao obter o benefício pelo ID',
        param: '/id/:id'
      }]
    })
  }
})
/**
 * GET /api/beneficios/razao/:filtor
 * Lista o benefício pelo nome
 * Parâmetros: filtro
 */
router.get('/nome/:filtro', async (req, res) => {
  try {
    const filtro = req.params.filtro.toString()
    const docs = []
    await db.collection(nomeCollection)
      .find({
        $or: [
          { 'nome': { $regex: filtro, $options: 'i' } },
        ]
      })
      .forEach((doc) => {
        docs.push(doc)
      })
    res.status(200).json(docs)
  } catch (err) {
    res.status(500).json({
      errors: [{
        value: `${err.message}`,
        msg: 'Erro ao obter o benefícios pelo nome',
        param: '/nome/:filtro'
      }]
    })
  }
})
/**
 * DELETE /api/beneficios/:id
 * Remove os benefícios pelo id
 * Parâmetros: id
 */
router.delete('/:id', async(req, res) => {
  const result = await db.collection(nomeCollection).deleteOne({
    "_id": { $eq: new ObjectId(req.params.id)}
  })
  if (result.deletedCount === 0){
    res.status(404).json({
      errors: [{
        value: `Não há nenhum benefício com o id ${req.params.id}`,
        msg: 'Erro ao excluir o benefício',
        param: '/:id'
      }]
    })
  } else {
    res.status(200).send(result)
  }
})

/**
 * POST /api/beneficios
 * Insere um novo benefício
 * Parâmetros: Objeto benefício
 */

router.post('/', validaBeneficio, async(req, res) => {
  try{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
      return res.status(400).json({ errors: errors.array()})
    }
    const beneficio = 
                 await db.collection(nomeCollection).insertOne(req.body)
    res.status(201).json(beneficio) //201 é o status created            
  } catch (err){
    res.status(500).json({message: `${err.message} Erro no Server`})
  }
})
/**
 * PUT /api/beneficios
 * Altera um benefício pelo _id
 * Parâmetros: Objeto benefício
 */
router.put('/', validaBeneficio, async(req, res) => {
  let idDocumento = req.body._id //armazenamos o _id do documento
  delete req.body._id //removemos o _id do body que foi recebido na req.
  try {
      const errors = validationResult(req)
      if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()})
      }
      const beneficio = await db.collection(nomeCollection)
      .updateOne({'_id': {$eq: new ObjectId(idDocumento)}},
                 {$set: req.body})
      res.status(202).json(beneficio) //Accepted           
  } catch (err){
    res.status(500).json({errors: err.message})
  }
})
export default router