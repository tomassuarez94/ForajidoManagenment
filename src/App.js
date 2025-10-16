import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Trash2,
  Edit2,
  X,
  Check,
  PieChart,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { auth, provider, signInWithPopup, signOut } from "./firebase";

const BarManagementSystem = () => {

  const [user, setUser] = useState(null);

  // 🔹 Iniciar sesión con Google
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      console.log("Usuario autenticado:", result.user.email);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  // 🔹 Cerrar sesión
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };


  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Leer transacciones al iniciar
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const data = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTransactions(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error("Error al obtener transacciones:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "ingreso",
    category: "",
    description: "",
    amount: "",
  });

  const categories = {
    ingreso: [
      "Ventas bebidas",
      "Ventas comidas",
      "Eventos especiales",
      "Propinas",
      "Otros ingresos",
    ],
    egreso: [
      "Licores",
      "Cerveza",
      "Cocteleria",
      "Salarios",
      "Servicios públicos",
      "Administracion",
      "Mantenimiento",
      "Marketing",
      "Otros gastos",
    ],
  };

  // 🔹 Guardar o actualizar en Firestore
  const handleSubmit = async () => {
    if (!formData.category || !formData.description || !formData.amount) {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      if (editingId) {
        const docRef = doc(db, "transactions", editingId);
        await updateDoc(docRef, {
          ...formData,
          amount: parseFloat(formData.amount),
        });
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? { ...t, ...formData, amount: parseFloat(formData.amount) }
              : t
          )
        );
        setEditingId(null);
      } else {
        const newTransaction = {
          ...formData,
          amount: parseFloat(formData.amount),
          createdAt: Date.now(),
        };
        const docRef = await addDoc(
          collection(db, "transactions"),
          newTransaction
        );
        setTransactions([{ id: docRef.id, ...newTransaction }, ...transactions]);
      }
    } catch (error) {
      console.error("Error al guardar transacción:", error);
    }

    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "ingreso",
      category: "",
      description: "",
      amount: "",
    });
    setShowForm(false);
  };

  // 🔹 Editar
  const handleEdit = (transaction) => {
    setFormData({
      date: transaction.date,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount.toString(),
    });
    setEditingId(transaction.id);
    setShowForm(true);
  };

  // 🔹 Eliminar
  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta transacción?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // 🔹 Filtros y estadísticas
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filter !== "all") {
      filtered = filtered.filter((t) => t.type === filter);
    }

    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();

      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter((t) => new Date(t.date) >= filterDate);
      } else if (dateFilter === "week") {
        filterDate.setDate(today.getDate() - 7);
        filtered = filtered.filter((t) => new Date(t.date) >= filterDate);
      } else if (dateFilter === "month") {
        filterDate.setMonth(today.getMonth() - 1);
        filtered = filtered.filter((t) => new Date(t.date) >= filterDate);
      }
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter, dateFilter]);

  const stats = useMemo(() => {
    const ingresos = filteredTransactions
      .filter((t) => t.type === "ingreso")
      .reduce((sum, t) => sum + t.amount, 0);

    const egresos = filteredTransactions
      .filter((t) => t.type === "egreso")
      .reduce((sum, t) => sum + t.amount, 0);

    const egresosPorCategoria = filteredTransactions
      .filter((t) => t.type === "egreso")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const egresosCategorias = Object.entries(egresosPorCategoria)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: egresos > 0 ? (amount / egresos) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      ingresos,
      egresos,
      balance: ingresos - egresos,
      egresosCategorias,
    };
  }, [filteredTransactions]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  // 🔹 Mostrar mientras carga
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-white text-2xl">
        Cargando datos...
      </div>
    );

  // 🔹 Retorna tu interfaz (idéntica a la anterior)
  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex justify-end mb-4">
            {user ? (
              <div className="flex items-center gap-4 text-white">
                <span>{user.displayName}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Iniciar con Google
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            $$ Forajido Managenment
          </h1>
          <p className="text-purple-200">Control de ingresos y egresos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100">Ingresos</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.ingresos)}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-100">Egresos</span>
              <TrendingDown className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.egresos)}</p>
          </div>

          <div className={`bg-gradient-to-br ${stats.balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-xl p-6 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Balance</span>
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.balance)}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all'
                    ? 'bg-white text-purple-900'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('ingreso')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'ingreso'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilter('egreso')}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'egreso'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
              >
                Egresos
              </button>
            </div>

            <div className="flex gap-3">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">Todo el tiempo</option>
                <option value="today">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
              </select>

              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setFormData({
                    date: new Date().toISOString().split('T')[0],
                    type: 'ingreso',
                    category: '',
                    description: '',
                    amount: ''
                  });
                }}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Agregar
              </button>

              <button
                onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition shadow-lg"
              >
                <PieChart className="w-5 h-5" />
                Análisis Egresos
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingId ? 'Editar Transacción' : 'Nueva Transacción'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories[formData.type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Descripción de la transacción"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (COP)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="100"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition"
                  >
                    <Check className="w-5 h-5" />
                    {editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showExpenseBreakdown && stats.egresosCategorias.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <PieChart className="w-6 h-6" />
                Análisis de Egresos por Categoría
              </h2>
              <button
                onClick={() => setShowExpenseBreakdown(false)}
                className="text-white hover:text-red-400 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {stats.egresosCategorias.map((item, index) => (
                <div key={item.category} className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-red-500' :
                          index === 1 ? 'bg-orange-500' :
                            index === 2 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}>
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-400">{formatCurrency(item.amount)}</p>
                      <p className="text-sm text-purple-200">{item.percentage.toFixed(1)}% del total</p>
                    </div>
                  </div>

                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${index === 0 ? 'bg-red-500' :
                          index === 1 ? 'bg-orange-500' :
                            index === 2 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}

              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-4 border border-red-500/30 mt-6">
                <p className="text-white font-medium mb-1">Total de Egresos</p>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(stats.egresos)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Transacciones
          </h2>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-purple-200">
              <p className="text-lg">No hay transacciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${transaction.type === 'ingreso'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          }`}>
                          {transaction.type === 'ingreso' ? '+ Ingreso' : '- Egreso'}
                        </span>
                        <span className="text-purple-200 text-sm">
                          {new Date(transaction.date).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <h3 className="text-white font-medium mb-1">{transaction.category}</h3>
                      <p className="text-purple-200 text-sm">{transaction.description}</p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <p className={`text-2xl font-bold ${transaction.type === 'ingreso' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {formatCurrency(transaction.amount)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarManagementSystem;
