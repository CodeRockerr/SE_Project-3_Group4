"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type SupportedLanguage = "en" | "es";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.spanish": "Spanish",
    "nav.about": "About",
    "nav.dashboard": "Dashboard",
    "nav.orders": "Orders",
    "nav.login": "Login",
    "nav.dashboardCta": "Dashboard",
    "nav.raiseBug": "Raise a Bug",
    "nav.logout": "Logout",
    "headline.word1": "Crave it",
    "headline.word2": "Today.",
    "headline.word3": "Find it",
    "headline.word4": "Quick.",
    "headline.word5": "Instantly.",
    "search.placeholder": "Search for any craving...",
    "search.ariaLabel": "Search for food",
    "search.pressEnter": "Press Enter to search",
    "search.orderBasedOn": "Order based on",
    "search.ingredients": "Ingredients",
    "search.ingredientMatches": "Ingredient Matches",
    "search.press": "Press",
    "search.demoAnnouncement": "Search activated. Type your query and press Enter to search.",
    "search.recommendationHeader": "Try searching for:",
    "search.recommendation1": "high protein burger with low saturated fat",
    "search.recommendation2": "food with less than 600 calories and more than 30g protein",
    "search.recommendation3": "high protein salad",
    "search.craving1": "spicy ramen",
    "search.craving2": "cheesy pizza",
    "search.craving3": "healthy salad",
    "footer.openSource": "Open Source",
    "footer.team": "Team:",
    "footer.github": "GitHub",
    "about.title": "About",
    "about.heroHeading": "Howl2Go",
    "about.sectionDescription": "The smart way to discover food nutrition. No menus. No hassle. Just search, find, and follow your health goals.",
    "about.whatIs": "What is Howl2Go?",
    "about.whatIsBody1": "Howl2Go is a revolutionary food delivery platform that puts nutritional information first. We believe you shouldn't have to scroll through endless menus to find what you're looking for.",
    "about.whatIsBody2": "Instead, we let you search for exactly what you want, whether it's a burger, a salad, or something specific like 'low-carb breakfast', and we show you instantly matching items from all restaurants with complete nutritional information.",
    "about.whatIsBody3": "Built with modern web technologies like Next.js, React, and TypeScript, Howl2Go delivers a premium, lightning-fast experience with a dark-mode interface designed for food lovers and health-conscious individuals.",
    "about.keyFeatures": "Key Features",
    "about.keyFeaturesSubtitle": "Everything you need for smarter food decisions",
    "about.feature.searchTitle": "Search-Focused Discovery",
    "about.feature.searchDesc": "No endless menu scrolling. Just search what you crave and find it instantly across all restaurants.",
    "about.feature.nutritionTitle": "Instant Nutrition Data",
    "about.feature.nutritionDesc": "Get complete nutritional info for every item: calories, protein, carbs, fat, and more at a glance.",
    "about.feature.healthTitle": "Health Dashboard",
    "about.feature.healthDesc": "Track your daily nutrition goals, monitor calories, and watch your progress with our intuitive dashboard.",
    "about.feature.cartTitle": "Smart Cart",
    "about.feature.cartDesc": "Add items from multiple restaurants with real-time pricing calculations and frictionless checkout.",
    "about.feature.securityTitle": "Safe & Private",
    "about.feature.securityDesc": "Your data is protected with industry-level security. We use httpOnly cookies and encrypted connections.",
    "about.feature.speedTitle": "Lightning Speed",
    "about.feature.speedDesc": "Built with Next.js and optimized for performance. Get results in milliseconds, not seconds.",
    "about.techTitle": "Built with Modern Technology",
    "about.techSubtitle": "Howl2Go is powered by cutting-edge web technologies to deliver a fast, reliable, and beautiful experience.",
    "about.ctaTitle": "Ready to Get Started?",
    "about.ctaSubtitle": "Search for your next meal and follow your nutrition goals today.",
    "about.ctaPrimary": "Start Searching",
    "about.ctaSecondary": "View Dashboard",
    "cta.startSearching": "Start Searching",
    "cta.viewDashboard": "View Dashboard",
    "orders.title": "Order History",
    "orders.noOrders": "No Orders Yet",
    "orders.noOrdersDesc": "Start ordering to see your history and insights here",
    "orders.startShopping": "Start Shopping",
    "orders.nutritionPatterns": "Nutrition Patterns",
    "orders.avgCalories": "Average Calories",
    "orders.avgProtein": "Average Protein",
    "orders.avgFat": "Average Fat",
    "orders.avgCarbs": "Average Carbs",
    "orders.topRestaurants": "Top Restaurants",
    "orders.trends": "Trends",
    "orders.recommendations": "Recommendations",
    "orders.analyzingPatterns": "Analyzing your order patterns...",
    "orders.fetchingHistory": "Fetching your order history...",
    "orders.totalPeriods": "Total Periods",
    "orders.avgOrdersPerDay": "Average Orders/Day",
    "orders.item": "item",
    "orders.items": "items",
    "orders.review": "Review",
    "orders.edit": "Edit",
    "orders.youReviewedThis": "You reviewed this",
    "orders.reviewedOn": "Reviewed on",
    "orders.previous": "Previous",
    "orders.next": "Next",
    "orders.pageOf": "Page {page} of {pages}",
    "cart.title": "Shopping Cart",
    "cart.orderPlaced": "Order Placed!",
    "cart.foodOnTheWay": "Your delicious food is on the way!",
    "cart.orderTotal": "Order Total",
    "cart.redirecting": "Redirecting to home...",
    "cart.emptyCart": "Your cart is empty",
    "cart.emptyCartDesc": "Add some delicious items to get started!",
    "cart.browseMenu": "Browse Menu",
    "cart.loadingCart": "Loading your cart...",
    "cart.item": "Item",
    "cart.items": "Items",
    "cart.clearCart": "Clear Cart",
    "cart.each": "each",
    "cart.orderSummary": "Order Summary",
    "cart.subtotal": "Subtotal",
    "cart.tax": "Tax (8%)",
    "cart.deliveryFee": "Delivery Fee",
    "cart.total": "Total",
    "cart.processing": "Processing your order...",
    "cart.loginToOrder": "Log In to Place Order",
    "cart.placeOrder": "Place Order",
    "cart.freeDelivery": "Free delivery on orders over $30",
    "cart.login": "Log in",
    "cart.toPlaceOrder": "to place an order",
    "recommendations.title": "Ingredient Matches",
    "recommendations.subtitle": "Build your Plate: Include flavors you love, Exclude what you don't!!",
    "recommendations.ingredient": "Ingredient",
    "recommendations.matches": "Matches",
    "recommendations.include": "Include Ingredients",
    "recommendations.exclude": "Exclude Ingredients",
    "recommendations.getMatches": "Get Matches",
    "recommendations.sortMatches": "Sort: Matches",
    "recommendations.sortCalories": "Sort: Calories",
    "recommendations.sortPriceAsc": "Sort: Price (Low to High)",
    "recommendations.sortPriceDesc": "Sort: Price (High to Low)",
    "recommendations.loading": "Loading...",
    "recommendations.totalMatches": "Total matches",
    "recommendations.noResults": "No results found for current filters.",
    "recommendations.previous": "Previous",
    "recommendations.next": "Next",
    "recommendations.page": "Page",
  },
  es: {
    "language.label": "Idioma",
    "language.english": "Ingles",
    "language.spanish": "Espanol",
    "nav.about": "Acerca de",
    "nav.dashboard": "Tablero",
    "nav.orders": "Pedidos",
    "nav.login": "Iniciar sesion",
    "nav.dashboardCta": "Panel",
    "nav.raiseBug": "Reportar un bug",
    "nav.logout": "Cerrar sesion",
    "headline.word1": "Antojalo",
    "headline.word2": "hoy.",
    "headline.word3": "Encuentralo",
    "headline.word4": "rapido.",
    "headline.word5": "Al instante.",
    "search.placeholder": "Busca cualquier antojo...",
    "search.ariaLabel": "Buscar comida",
    "search.pressEnter": "Presiona Enter para buscar",
    "search.orderBasedOn": "Pide segun",
    "search.ingredients": "Ingredientes",
    "search.ingredientMatches": "Coincidencias por ingredientes",
    "search.press": "Presiona",
    "search.demoAnnouncement": "Busqueda activada. Escribe tu consulta y presiona Enter para buscar.",
    "search.recommendationHeader": "Intenta buscar:",
    "search.recommendation1": "hamburguesa alta en proteina con poca grasa saturada",
    "search.recommendation2": "comida con menos de 600 calorias y mas de 30 g de proteina",
    "search.recommendation3": "ensalada alta en proteina",
    "search.craving1": "ramen picante",
    "search.craving2": "pizza con queso",
    "search.craving3": "ensalada saludable",
    "footer.openSource": "Codigo abierto",
    "footer.team": "Equipo:",
    "footer.github": "GitHub",
    "about.title": "Acerca de",
    "about.heroHeading": "Howl2Go",
    "about.sectionDescription": "La forma inteligente de descubrir la nutricion de los alimentos. Sin menus. Sin molestias. Solo busca, encuentra y sigue tus metas de salud.",
    "about.whatIs": "Que es Howl2Go?",
    "about.whatIsBody1": "Howl2Go es una plataforma revolucionaria de entrega de comida que pone primero la informacion nutricional. Creemos que no deberias tener que desplazarte por menus interminables para encontrar lo que buscas.",
    "about.whatIsBody2": "En su lugar, te permitimos buscar exactamente lo que quieres, ya sea una hamburguesa, una ensalada o algo especifico como \"desayuno bajo en carbohidratos\", y te mostramos al instante los elementos coincidentes de todos los restaurantes con informacion nutricional completa.",
    "about.whatIsBody3": "Construido con tecnologias web modernas como Next.js, React y TypeScript, Howl2Go ofrece una experiencia premium, rapidisima y con una interfaz en modo oscuro disenada para amantes de la comida y personas conscientes de su salud.",
    "about.keyFeatures": "Funciones clave",
    "about.keyFeaturesSubtitle": "Todo lo que necesitas para decisiones de comida mas inteligentes",
    "about.feature.searchTitle": "Descubrimiento centrado en la busqueda",
    "about.feature.searchDesc": "Nada de desplazarse sin fin por menus. Solo busca lo que se te antoja y encuentralo al instante en todos los restaurantes.",
    "about.feature.nutritionTitle": "Datos nutricionales al instante",
    "about.feature.nutritionDesc": "Obten informacion nutricional completa de cada articulo: calorias, proteinas, carbohidratos, grasas y mas de un vistazo.",
    "about.feature.healthTitle": "Panel de control de salud",
    "about.feature.healthDesc": "Sigue tus objetivos diarios de nutricion, monitorea calorias y mira tu progreso con nuestro panel intuitivo.",
    "about.feature.cartTitle": "Carrito inteligente",
    "about.feature.cartDesc": "Agrega articulos de varios restaurantes con calculos de precio en tiempo real y un pago sin fricciones.",
    "about.feature.securityTitle": "Seguro y privado",
    "about.feature.securityDesc": "Tus datos estan protegidos con seguridad de nivel industrial. Usamos cookies httpOnly y conexiones cifradas.",
    "about.feature.speedTitle": "Velocidad relampago",
    "about.feature.speedDesc": "Construido con Next.js y optimizado para rendimiento. Obten resultados en milisegundos, no en segundos.",
    "about.techTitle": "Construido con tecnologia moderna",
    "about.techSubtitle": "Howl2Go esta impulsado por tecnologias web de vanguardia para ofrecer una experiencia rapida, confiable y hermosa.",
    "about.ctaTitle": "Listo para comenzar?",
    "about.ctaSubtitle": "Busca tu proxima comida y sigue tus metas de nutricion hoy.",
    "about.ctaPrimary": "Comenzar a buscar",
    "about.ctaSecondary": "Ver panel",
    "cta.startSearching": "Comenzar a buscar",
    "cta.viewDashboard": "Ver panel",
    "orders.title": "Historial de pedidos",
    "orders.noOrders": "Sin pedidos aun",
    "orders.noOrdersDesc": "Comienza a pedir para ver tu historial e informacion aqui",
    "orders.startShopping": "Comenzar a comprar",
    "orders.nutritionPatterns": "Patrones de nutricion",
    "orders.avgCalories": "Calorias promedio",
    "orders.avgProtein": "Proteina promedio",
    "orders.avgFat": "Grasa promedio",
    "orders.avgCarbs": "Carbohidratos promedio",
    "orders.topRestaurants": "Restaurantes principales",
    "orders.trends": "Tendencias",
    "orders.recommendations": "Recomendaciones",
    "orders.analyzingPatterns": "Analizando tus patrones de pedidos...",
    "orders.fetchingHistory": "Obteniendo tu historial de pedidos...",
    "orders.totalPeriods": "Periodos totales",
    "orders.avgOrdersPerDay": "Pedidos promedio/dia",
    "orders.item": "articulo",
    "orders.items": "articulos",
    "orders.review": "Resena",
    "orders.edit": "Editar",
    "orders.youReviewedThis": "Reseniaste esto",
    "orders.reviewedOn": "Reseniado el",
    "orders.previous": "Anterior",
    "orders.next": "Siguiente",
    "orders.pageOf": "Pagina {page} de {pages}",
    "cart.title": "Carrito de compras",
    "cart.orderPlaced": "Pedido realizado!",
    "cart.foodOnTheWay": "Tu deliciosa comida esta en camino!",
    "cart.orderTotal": "Total del pedido",
    "cart.redirecting": "Redirigiendo a casa...",
    "cart.emptyCart": "Tu carrito esta vacio",
    "cart.emptyCartDesc": "Agrega algunos articulos deliciosos para comenzar!",
    "cart.browseMenu": "Navegar menu",
    "cart.loadingCart": "Cargando tu carrito...",
    "cart.item": "articulo",
    "cart.items": "articulos",
    "cart.clearCart": "Vaciar carrito",
    "cart.each": "cada uno",
    "cart.orderSummary": "Resumen del pedido",
    "cart.subtotal": "Subtotal",
    "cart.tax": "Impuesto (8%)",
    "cart.deliveryFee": "Tarifa de entrega",
    "cart.total": "Total",
    "cart.processing": "Procesando tu pedido...",
    "cart.loginToOrder": "Inicia sesion para realizar pedido",
    "cart.placeOrder": "Realizar pedido",
    "cart.freeDelivery": "Entrega gratis en pedidos mayores a $30",
    "cart.login": "Inicia sesion",
    "cart.toPlaceOrder": "para realizar un pedido",
    "recommendations.title": "Coincidencias por ingredientes",
    "recommendations.subtitle": "Construye tu plato: incluye los sabores que amas, excluye lo que no quieres",
    "recommendations.include": "Incluir ingredientes",
    "recommendations.exclude": "Excluir ingredientes",
    "recommendations.getMatches": "Obtener coincidencias",
    "recommendations.sortMatches": "Ordenar: coincidencias",
    "recommendations.sortCalories": "Ordenar: calorias",
    "recommendations.sortPriceAsc": "Ordenar: precio (menor a mayor)",
    "recommendations.sortPriceDesc": "Ordenar: precio (mayor a menor)",
    "recommendations.loading": "Cargando...",
    "recommendations.totalMatches": "Coincidencias totales",
    "recommendations.noResults": "No se encontraron resultados para los filtros actuales.",
    "recommendations.previous": "Anterior",
    "recommendations.next": "Siguiente",
    "recommendations.page": "Pagina",
  },
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "howl2go-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "es" || stored === "en") {
      setLanguageState(stored);
      if (typeof document !== "undefined") {
        document.documentElement.lang = stored;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const persistLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    persistLanguage(language === "en" ? "es" : "en");
  }, [language, persistLanguage]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dictionary = TRANSLATIONS[language] ?? {};
      const englishDictionary = TRANSLATIONS.en;
      return dictionary[key] ?? fallback ?? englishDictionary[key] ?? key;
    },
    [language]
  );

  const value: LanguageContextValue = {
    language,
    setLanguage: persistLanguage,
    toggleLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
