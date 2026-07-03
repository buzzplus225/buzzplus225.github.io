const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dnxogdmnwjeszhsnluhf.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_uFIUz7GqohV9HAWZnwZEgA_ikt_YGFv';
const BASE_URL = 'https://buzzplus225.github.io';
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

/**
 * Génère un slug propre à partir d'un titre
 */
function generateSlug(title) {
    if (!title) return 'article';
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/[^a-z0-9\s-]/g, '')    // Supprime les caractères spéciaux
        .replace(/\s+/g, '-')            // Remplace les espaces par des tirets
        .replace(/-+/g, '-')             // Supprime les tirets consécutifs
        .trim();
}

/**
 * Récupère les articles publiés depuis Supabase
 */
async function fetchArticles() {
    const url = `${SUPABASE_URL}/rest/v1/articles?select=id,slug,title,published_at&order=published_at.desc&limit=100`;
    
    // Sécurité au cas où fetch global n'est pas dispo (Node < 18)
    if (typeof fetch === 'undefined') {
        throw new Error("L'API 'fetch' n'est pas disponible. Veuillez utiliser Node.js 18+ ou installer 'node-fetch'.");
    }

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    
    if (!response.ok) {
        throw new Error(`Erreur Supabase: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
}

/**
 * Génère la structure XML du sitemap
 */
function generateSitemapXml(articles) {
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

    // ✨ CORRECTION : Ajout de la page d'accueil obligatoire pour le SEO
    xml += `
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    articles.forEach(article => {
        let date = today;
        if (article.published_at) {
            try {
                date = new Date(article.published_at).toISOString().split('T')[0];
            } catch (e) {
                // Reste sur la date du jour par défaut en cas de format invalide
            }
        }

        // Utilise le slug existant ou le génère
        const slug = article.slug || generateSlug(article.title);

        xml += `
  <url>
    <loc>${BASE_URL}/article/${encodeURIComponent(slug)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `\n</urlset>`;
    return xml;
}

/**
 * Fonction principale du script
 */
async function main() {
    try {
        console.log('🔄 Récupération des articles depuis Supabase...');
        const articles = await fetchArticles();
        console.log(`✅ ${articles.length} articles publiés récupérés`);
        
        const xml = generateSitemapXml(articles);
        
        // S'assurer que le dossier parent existe avant d'écrire le fichier
        const dir = path.dirname(SITEMAP_PATH);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
        
        console.log(`✅ Sitemap généré avec succès (${articles.length + 1} URLs) à : ${SITEMAP_PATH}`);
    } catch (error) {
        console.error('❌ Erreur lors de la génération du sitemap:', error.message);
        process.exit(1);
    }
}

main();
