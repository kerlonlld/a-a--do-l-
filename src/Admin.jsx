import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Trash2, Edit, LogOut, Save, X, PlusCircle } from 'lucide-react';

function Admin() {
  const [logado, setLogado] = useState(false);
  const [senha, setSenha] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    imagem: '',
    personalizavel: false,
    adicionais: [],
    emFalta: false // CAMPO NOVO
  });
  const [novoAdicional, setNovoAdicional] = useState({ nome: '', preco: '' });

  const SENHA_ADMIN = import.meta.env.VITE_ADMIN_PASSWORD;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (logado) buscarProdutos();
  }, [logado]);

  const buscarProdutos = async () => {
    const querySnapshot = await getDocs(collection(db, 'produtos'));
    const lista = querySnapshot.docs.map(doc => ({
      id: doc.id,
     ...doc.data(),
      adicionais: doc.data().adicionais || [],
      emFalta: doc.data().emFalta || false // GARANTE QUE EXISTE
    }));
    setProdutos(lista);
  };

  const fazerLogin = (e) => {
    e.preventDefault();
    if (!SENHA_ADMIN) {
      alert('Senha de administrador não configurada. Verifique o arquivo .env.');
      return;
    }

    if (senha === SENHA_ADMIN) {
      setLogado(true);
      sessionStorage.setItem('adminLogado', 'true');
    } else {
      alert('Senha incorreta!');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionStorage.getItem('adminLogado') === 'true') setLogado(true);
  }, []);

  const handleLogout = () => {
    setLogado(false);
    sessionStorage.removeItem('adminLogado');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox'? checked : value;
    if (editando) {
      setEditando({...editando, [name]: val });
    } else {
      setNovoProduto({...novoProduto, [name]: val });
    }
  };

  const adicionarAdicional = () => {
    if (!novoAdicional.nome ||!novoAdicional.preco) return;
    const produto = editando || novoProduto;
    const adicionaisAtualizados = [...(produto.adicionais || []), {...novoAdicional, preco: parseFloat(novoAdicional.preco)}];

    if (editando) {
      setEditando({...editando, adicionais: adicionaisAtualizados });
    } else {
      setNovoProduto({...novoProduto, adicionais: adicionaisAtualizados });
    }
    setNovoAdicional({ nome: '', preco: '' });
  };

  const removerAdicional = (index) => {
    const produto = editando || novoProduto;
    const adicionaisAtualizados = (produto.adicionais || []).filter((_, i) => i!== index);
    if (editando) {
      setEditando({...editando, adicionais: adicionaisAtualizados });
    } else {
      setNovoProduto({...novoProduto, adicionais: adicionaisAtualizados });
    }
  };

  const salvarProduto = async (e) => {
    e.preventDefault();
    const produto = editando || novoProduto;
    if (!produto.nome ||!produto.preco) {
      alert('Preencha nome e preço base!');
      return;
    }

    const dados = {
     ...produto,
      preco: parseFloat(produto.preco),
      adicionais: produto.adicionais || [],
      emFalta: produto.emFalta || false // SALVA O STATUS
    };

    if (editando) {
      const produtoRef = doc(db, 'produtos', editando.id);
      await updateDoc(produtoRef, dados);
      setEditando(null);
    } else {
      await addDoc(collection(db, 'produtos'), dados);
      setNovoProduto({ nome: '', descricao: '', preco: '', categoria: '', imagem: '', personalizavel: false, adicionais: [], emFalta: false });
    }
    buscarProdutos();
  };

  const deletarProduto = async (id) => {
    if (window.confirm('Tem certeza que quer apagar?')) {
      await deleteDoc(doc(db, 'produtos', id));
      buscarProdutos();
    }
  };

  const iniciarEdicao = (produto) => {
    setEditando({
     ...produto,
      adicionais: produto.adicionais || [],
      emFalta: produto.emFalta || false
    });
  };

  if (!logado) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <form onSubmit={fazerLogin} className="bg-gray-800 p-8 rounded-lg w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Painel Admin</h1>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite a senha" className="w-full bg-gray-700 p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-yellow-500" />
          <button type="submit" className="w-full bg-yellow-500 text-black p-3 rounded font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  const produtoAtual = editando || novoProduto;

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded"><LogOut size={18} /> Sair</button>
      </header>

      <form onSubmit={salvarProduto} className="bg-gray-800 p-6 rounded-lg mb-8 space-y-4">
        <h2 className="text-xl font-bold">{editando? 'Editando Produto' : 'Adicionar Novo Produto'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="nome" value={produtoAtual.nome} onChange={handleInputChange} placeholder="Nome do produto" className="bg-gray-700 p-2 rounded" />
          <input name="preco" type="number" step="0.01" value={produtoAtual.preco} onChange={handleInputChange} placeholder="Preço Base" className="bg-gray-700 p-2 rounded" />
          <input name="categoria" value={produtoAtual.categoria} onChange={handleInputChange} placeholder="Categoria: Açaí, Lanches..." className="bg-gray-700 p-2 rounded" />
          <input name="imagem" value={produtoAtual.imagem} onChange={handleInputChange} placeholder="URL da Imagem" className="bg-gray-700 p-2 rounded" />
          <textarea name="descricao" value={produtoAtual.descricao} onChange={handleInputChange} placeholder="Descrição" className="bg-gray-700 p-2 rounded md:col-span-2" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" name="personalizavel" checked={produtoAtual.personalizavel} onChange={handleInputChange} id="personalizavel" />
            <label htmlFor="personalizavel">Este produto tem adicionais?</label>
          </div>

          {/* CAIXINHA NOVA DE EM FALTA */}
          <div className="flex items-center gap-2">
            <input type="checkbox" name="emFalta" checked={produtoAtual.emFalta} onChange={handleInputChange} id="emFalta" />
            <label htmlFor="emFalta" className="text-red-400 font-semibold">Marcar como Esgotado</label>
          </div>
        </div>

        {produtoAtual.personalizavel && (
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="font-bold mb-2">Adicionais do Produto</h3>
            <div className="flex gap-2 mb-3">
              <input value={novoAdicional.nome} onChange={(e) => setNovoAdicional({...novoAdicional, nome: e.target.value})} placeholder="Nome: Nutella" className="bg-gray-600 p-2 rounded flex-1" />
              <input value={novoAdicional.preco} onChange={(e) => setNovoAdicional({...novoAdicional, preco: e.target.value})} placeholder="Preço: 4.00" type="number" step="0.01" className="bg-gray-600 p-2 rounded w-28" />
              <button type="button" onClick={adicionarAdicional} className="bg-purple-600 p-2 rounded"><PlusCircle size={18} /></button>
            </div>
            <div className="space-y-1">
              {(produtoAtual.adicionais || []).map((add, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-600 p-2 rounded text-sm">
                  <span>{add.nome} - R$ {add.preco.toFixed(2)}</span>
                  <button type="button" onClick={() => removerAdicional(index)}><X size={16} className="text-red-400" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button type="submit" className="flex-1 bg-green-600 p-3 rounded font-bold flex items-center justify-center gap-2"><Save size={18} /> {editando? 'Salvar Alterações' : 'Adicionar Produto'}</button>
          {editando && <button type="button" onClick={() => setEditando(null)} className="bg-gray-600 p-3 rounded"><X size={18} /></button>}
        </div>
      </form>

      <div className="space-y-4">
        {produtos.map(produto => (
          <div key={produto.id} className={`bg-gray-800 p-4 rounded-lg flex items-center gap-4 ${produto.emFalta? 'opacity-50' : ''}`}>
            <img src={produto.imagem} alt={produto.nome} className="w-20 h-20 object-cover rounded" />
            <div className="flex-grow">
              <h3 className="font-bold text-lg">
                {produto.nome}
                {produto.emFalta && <span className="ml-2 text-red-500 text-sm">ESGOTADO</span>}
              </h3>
              <p className="text-sm text-gray-400">{produto.categoria} - A partir de R$ {produto.preco.toFixed(2)}</p>
              {produto.personalizavel && <p className="text-xs text-purple-400">{produto.adicionais?.length || 0} adicionais</p>}
            </div>
            <button onClick={() => iniciarEdicao(produto)} className="bg-blue-600 p-2 rounded"><Edit size={18} /></button>
            <button onClick={() => deletarProduto(produto.id)} className="bg-red-600 p-2 rounded"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
