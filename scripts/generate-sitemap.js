const fs = require('fs');
const path = require('path');

// Tes clés d'origine sont conservées ici
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dnxogdmnwjeszhsnluhf.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_uFIUz7GqohV9HAWZnwZEgA_ikt_YGFv';
const BASE_URL = 'https://buzzplus225.github.io';
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

/**
 * Échappe les caractères spéciaux pour éviter de corrompre le XML (Sécurité Google)
 */
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

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
 * Génère la structure XML du sitemap (Version Ultra-Compatible)
 */
function generateSitemapXml(articles) {
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Page d'accueil obligatoire
    xml += `
  <url>
    <loc>${escapeXml(BASE_URL)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
  </url>`;

    articles.forEach(article => {
        let date = today;
        if (article.published_at) {
            try {
                date = new Date(article.published_at).toISOString().split('T')[0];
            } catch (e) {
                // Reste sur la date du jour par défaut
            }
        }

        const slug = article.slug || generateSlug(article.title);
        const fullUrl = `${BASE_URL}/article/${slug}`;

        // Sécurisation de la chaîne de l'URL pour le format XML
        xml += `
  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
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
