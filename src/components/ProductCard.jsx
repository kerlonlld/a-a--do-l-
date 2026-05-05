export default function ProductCard ({produto, addToCart}){

    return(
        <div className="bg-gray-800 rounded-lg p-4 flex gap-4">
            <img 
            src={produto.imagem}
            alt={produto.nome}
            className="w-24 h-24 object-cover rounded-md"
        />
        <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{produto.nome}</h3>
            <p className="text-gray-400 text-sm"> { produto.descricao}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-green-500 font-bold text-xl"> R$ { produto.preco.toFixed(2)}</span>
                <button 
                onClick={()=> addToCart(produto)}
                 className="bg-green-600 px-3 py-1 rounded text-white font-bold hover:bg-green-700" >+Add</button>
            </div>
        </div>
        </div>
    )
}