import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, X } from 'lucide-react';

// COMPONENTE DO CARD COM ESGOTADO
const ProdutoCard = ({ produto, onAdd }) => {
  const emFalta = produto.emFalta || false;

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col transition-opacity ${emFalta? 'opacity-60' : ''}`}>
      <div className="relative">
        <img src={produto.imagem} alt={produto.nome} className="w-full h-48 object-cover" />
        {emFalta && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg rotate-[-15deg]">
              ESGOTADO
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <span className="text-xs bg-gray-700 px-2 py-1 rounded self-start">{produto.categoria}</span>
        <h2 className="text-xl font-bold mt-2">{produto.nome}</h2>
        <p className="text-gray-400 text-sm mt-1 flex-grow">{produto.descricao}</p>
        {produto.personalizavel && <p className="text-xs text-purple-400 mt-2">+ {produto.adicionais?.length || 0} adicionais</p>}
        <div className="flex justify-between items-center mt-4">
          <span className="text-2xl font-bold text-purple-500">
            {produto.personalizavel? 'A partir de ' : ''}R$ {produto.preco.toFixed(2)}
          </span>
          <button
            onClick={() => onAdd(produto)}
            disabled={emFalta}
            className="bg-purple-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-purple-400 flex items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {emFalta? <X size={18} /> : <Plus size={18} />}
            {emFalta? 'Esgotado' : produto.personalizavel? 'Montar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [produtos, setProdutos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [carrinho, setCarrinho] = useState([]);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [etapaCheckout, setEtapaCheckout] = useState(false);
  const [modalProduto, setModalProduto] = useState(null);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState([]);
  const primeiroRender = useRef(true);

  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    endereco: '',
    pagamento: 'Dinheiro'
  });

  // Carrega carrinho do localStorage
  useEffect(() => {
    try {
      const carrinhoSalvo = localStorage.getItem('carrinho');
      if (carrinhoSalvo) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCarrinho(JSON.parse(carrinhoSalvo));
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
      localStorage.removeItem('carrinho');
    }
  }, []);

  // Salva carrinho no localStorage, mas pula o primeiro render
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  // Busca produtos no Firebase
  useEffect(() => {
    const buscarProdutos = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'produtos'));
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
         ...doc.data(),
          emFalta: doc.data().emFalta || false
        }));
        setProdutos(lista);
      } catch (error) {
        console.error("Erro ao buscar produtos: ", error);
      } finally {
        setLoading(false);
      }
    };

    buscarProdutos();
  }, []);

  const categorias = ['Todos',...new Set(produtos.map(p => p.categoria))];
  const produtosFiltrados = categoriaAtiva === 'Todos'
   ? produtos
    : produtos.filter(p => p.categoria === categoriaAtiva);

  // ABRE MODAL SE FOR PERSONALIZÁVEL, SENÃO ADICIONA DIRETO
  const adicionarCarrinho = (produto) => {
    if (produto.emFalta) return;

    if (produto.personalizavel) {
      setModalProduto(produto);
      setAdicionaisSelecionados([]);
    } else {
      adicionarItemCarrinho(produto, [], produto.preco);
    }
  };

  const toggleAdicional = (adicional) => {
    setAdicionaisSelecionados(prev => {
      const existe = prev.find(a => a.nome === adicional.nome);
      if (existe) {
        return prev.filter(a => a.nome!== adicional.nome);
      } else {
        return [...prev, adicional];
      }
    });
  };

  // FIX: useMemo pra forçar recalcular no mobile quando desmarca
  const precoTotalModal = useMemo(() => {
    if (!modalProduto) return 0;
    const precoAdicionais = adicionaisSelecionados.reduce((total, add) => total + add.preco, 0);
    return modalProduto.preco + precoAdicionais;
  }, [modalProduto, adicionaisSelecionados]);

  const adicionarProdutoPersonalizado = () => {
    adicionarItemCarrinho(modalProduto, adicionaisSelecionados, precoTotalModal);
    setModalProduto(null);
    setAdicionaisSelecionados([]);
  };

  const adicionarItemCarrinho = (produto, adicionais = [], precoFinal) => {
    setCarrinho(prev => {
      const idUnico = `${produto.id}-${JSON.stringify(adicionais)}`;
      const itemExistente = prev.find(item => item.idUnico === idUnico);
      if (itemExistente) {
        return prev.map(item =>
          item.idUnico === idUnico
           ? {...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, {
        idUnico,
        id: produto.id,
        nome: produto.nome,
        imagem: produto.imagem,
        precoFinal,
        adicionais,
        quantidade: 1
      }];
    });
  };

  const diminuirQuantidade = (idUnico) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.idUnico === idUnico);
      if (itemExistente.quantidade === 1) {
        return prev.filter(item => item.idUnico!== idUnico);
      }
      return prev.map(item =>
        item.idUnico === idUnico
         ? {...item, quantidade: item.quantidade - 1 }
          : item
      );
    });
  };

  const aumentarQuantidade = (idUnico) => {
    setCarrinho(prev =>
      prev.map(item =>
        item.idUnico === idUnico
         ? {...item, quantidade: item.quantidade + 1 }
          : item
      )
    );
  };

  const removerItem = (idUnico) => {
    setCarrinho(prev => prev.filter(item => item.idUnico!== idUnico));
  };

  const totalCarrinho = carrinho.reduce((total, item) => total + item.precoFinal * item.quantidade, 0);
  const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);

  const finalizarPedido = () => {
    const numeroWhatsApp = "5538998210980";

    let mensagem = `*NOVO PEDIDO*\n\n`;
    mensagem += `*Cliente:* ${dadosCliente.nome}\n`;
    mensagem += `*Endereço:* ${dadosCliente.endereco}\n`;
    mensagem += `*Pagamento:* ${dadosCliente.pagamento}\n\n`;
    mensagem += `*Itens do Pedido:*\n`;

    carrinho.forEach(item => {
      mensagem += `${item.quantidade}x ${item.nome} - R$ ${(item.precoFinal * item.quantidade).toFixed(2)}\n`;
      if (item.adicionais && item.adicionais.length > 0) {
        mensagem += `_Adicionais: ${item.adicionais.map(a => a.nome).join(', ')}_\n`;
      }
    });

    mensagem += `\n*Total: R$ ${totalCarrinho.toFixed(2)}*`;

    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');

    setCarrinho([]);
    setMostrarCarrinho(false);
    setEtapaCheckout(false);
    setDadosCliente({ nome: '', endereco: '', pagamento: 'Dinheiro' });
  };

  const fecharCarrinho = () => {
    setMostrarCarrinho(false);
    setEtapaCheckout(false);
  }

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <Loader2 className="animate-spin mr-2" size={32} />
        <span className="text-xl">Carregando cardápio...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <header className="bg-gray-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-center text-white relative">
            <span className="bg-gradient-to-b from-purple-400 to-purple-700 bg-clip-text text-transparent">Açai do Lé</span>
            <span className="absolute inset-0 text-purple-900 translate-y-1 translate-x-1 -z-10">Açai do Lé</span>
          </h1>
          <button
            onClick={() => setMostrarCarrinho(true)}
            className="relative bg-purple-500 text-black p-3 rounded-full hover:bg-purple-400"
          >
            <ShoppingCart size={24} />
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                {totalItens}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                categoriaAtiva === cat
                 ? 'bg-purple-500 text-black'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtosFiltrados.map(produto => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              onAdd={adicionarCarrinho}
            />
          ))}
        </div>
      </div>

      {/* MODAL DE ADICIONAIS - FIX MOBILE DESMARCAR */}
      {modalProduto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-30 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-800 w-full max-w-md rounded-lg shadow-xl flex flex-col max-h-">
            <div className="flex justify-between items-center p-3 border-b border-gray-700">
              <h2 className="text-lg font-bold">{modalProduto.nome}</h2>
              <button onClick={() => setModalProduto(null)}><X size={20} /></button>
            </div>

            <div className="p-3 overflow-y-auto">
              <img src={modalProduto.imagem} alt={modalProduto.nome} className="w-full h-32 sm:h-40 object-cover rounded mb-3" />
              <p className="text-gray-400 text-xs sm:text-sm mb-3">{modalProduto.descricao}</p>

              <h3 className="font-bold text-base mb-2 text-purple-400">Adicionais</h3>
              <div className="space-y-2">
                {modalProduto.adicionais.map((add) => {
                  const selecionado = adicionaisSelecionados.some(a => a.nome === add.nome)
                  return (
                    <div
                      key={add.nome}
                      onClick={() => toggleAdicional(add)}
                      className={`w-full flex items-center justify-between bg-gray-700 p-3 rounded cursor-pointer active:scale-[0.98] transition-all ${selecionado? 'ring-2 ring-purple-500 bg-gray-600' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${selecionado? 'bg-purple-500 border-purple-500' : 'border-gray-400'}`}>
                          {selecionado && <X size={14} className="text-black" />}
                        </div>
                        <span className="text-sm">{add.nome}</span>
                      </div>
                      <span className="text-green-400 font-semibold text-sm">+ R$ {add.preco.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-3 border-t border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-base">Total:</span>
                <span key={adicionaisSelecionados.length} className="text-xl font-bold text-green-400">R$ {precoTotalModal.toFixed(2)}</span>
              </div>
              <button
                onClick={adicionarProdutoPersonalizado}
                className="w-full bg-yellow-500 text-black p-3 rounded-lg font-bold hover:bg-yellow-400 active:bg-yellow-600"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRINHO */}
      {mostrarCarrinho && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-end z-20"
          onClick={fecharCarrinho}
        >
          <div
            className="bg-gray-800 w-full max-w-md h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {etapaCheckout? 'Finalizar Pedido' : 'Seu Pedido'}
              </h2>
              <button onClick={fecharCarrinho} className="text-2xl">&times;</button>
            </div>

            {carrinho.length === 0? (
              <p className="p-4 text-gray-400">Seu carrinho está vazio</p>
            ) :!etapaCheckout? (
              <>
                <div className="p-4 flex-grow overflow-y-auto">
                  {carrinho.map(item => (
                    <div key={item.idUnico} className="flex gap-4 mb-4 border-b border-gray-700 pb-4">
                      <img src={item.imagem} alt={item.nome} className="w-20 h-20 object-cover rounded" />
                      <div className="flex-grow">
                        <h3 className="font-bold">{item.nome}</h3>
                        {item.adicionais && item.adicionais.length > 0 && (
                          <p className="text-xs text-gray-400">
                            + {item.adicionais.map(a => a.nome).join(', ')}
                          </p>
                        )}
                        <p className="text-purple-500">R$ {item.precoFinal.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => diminuirQuantidade(item.idUnico)} className="bg-gray-700 p-1 rounded">
                            <Minus size={16} />
                          </button>
                          <span>{item.quantidade}</span>
                          <button onClick={() => aumentarQuantidade(item.idUnico)} className="bg-gray-700 p-1 rounded">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removerItem(item.idUnico)} className="text-red-500">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total:</span>
                    <span>R$ {totalCarrinho.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setEtapaCheckout(true)}
                    className="w-full bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600"
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 flex-grow">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-1">Seu Nome</label>
                      <input
                        type="text"
                        value={dadosCliente.nome}
                        onChange={(e) => setDadosCliente({...dadosCliente, nome: e.target.value })}
                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:border-yellow-500 outline-none"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Endereço de Entrega</label>
                      <textarea
                        value={dadosCliente.endereco}
                        onChange={(e) => setDadosCliente({...dadosCliente, endereco: e.target.value })}
                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:border-yellow-500 outline-none"
                        placeholder="Ex: Rua das Flores, 123, Bairro Centro"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Forma de Pagamento</label>
                      <select
                        value={dadosCliente.pagamento}
                        onChange={(e) => setDadosCliente({...dadosCliente, pagamento: e.target.value })}
                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:border-yellow-500 outline-none"
                      >
                        <option>Dinheiro</option>
                        <option>Cartão de Crédito</option>
                        <option>Cartão de Débito</option>
                        <option>PIX</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total:</span>
                    <span>R$ {totalCarrinho.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={finalizarPedido}
                    disabled={!dadosCliente.nome ||!dadosCliente.endereco}
                    className="w-full bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Enviar Pedido no WhatsApp
                  </button>
                  <button
                    onClick={() => setEtapaCheckout(false)}
                    className="w-full text-gray-400 py-2 mt-2"
                  >
                    Voltar para o carrinho
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;