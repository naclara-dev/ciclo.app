<?php

namespace App\Core;

class Translator {
    private $language;
    private $fallbackLanguage;
    private $basePath;
    private $catalogs = [];

    public function __construct(string $language = 'pt-br', string $fallbackLanguage = 'pt-br', ?string $basePath = null) {
        // Define os idiomas usados para traducao e fallback
        $this->language = $this->normalizeLanguage($language);
        $this->fallbackLanguage = $this->normalizeLanguage($fallbackLanguage);
        $this->basePath = $basePath ?: BASE_PATH . '/resources/lang';
    }

    public function getLanguage(): string {
        return $this->language;
    }

    public function getCatalog(): array {
        // Carrega o catálogo padrão antes de aplicar as traduções do idioma atual
        $fallbackCatalog = $this->loadCatalog($this->fallbackLanguage);
        $currentCatalog = $this->loadCatalog($this->language);

        // Retorna o catálogo atual com fallback para chaves ausentes
        return $this->mergeCatalogs($fallbackCatalog, $currentCatalog);
    }

    public function translate(string $key, array $replacements = []): string {
        // Carrega o texto no idioma atual antes de tentar o fallback
        $text = $this->resolve($this->language, $key);

        if ($text === null && $this->language !== $this->fallbackLanguage) {
            // Carrega o texto no idioma padrao quando a chave nao existe no idioma atual
            $text = $this->resolve($this->fallbackLanguage, $key);
        }

        if ($text === null) {
            // Interrompe usando a propria chave quando nenhum catalogo possui traducao
            return $key;
        }

        // Substitui valores dinamicos informados pelo template
        foreach ($replacements as $name => $value) {
            $text = str_replace(':' . $name, (string) $value, $text);
        }

        return $text;
    }

    private function resolve(string $language, string $key): ?string {
        // Carrega o catalogo necessario antes de navegar pela chave
        $catalog = $this->loadCatalog($language);
        $value = $catalog;

        // Percorre a chave em formato dot notation
        foreach (explode('.', $key) as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return null;
            }

            $value = $value[$segment];
        }

        return is_scalar($value) ? (string) $value : null;
    }

    private function mergeCatalogs(array $fallbackCatalog, array $currentCatalog): array {
        // Inicializa o catálogo mesclado com as chaves padrão
        $mergedCatalog = $fallbackCatalog;

        // Percorre as chaves do idioma atual preservando objetos aninhados
        foreach ($currentCatalog as $key => $value) {
            if (is_array($value) && isset($mergedCatalog[$key]) && is_array($mergedCatalog[$key])) {
                // Mescla recursivamente grupos de tradução
                $mergedCatalog[$key] = $this->mergeCatalogs($mergedCatalog[$key], $value);
                continue;
            }

            // Define o valor do idioma atual sobre o fallback
            $mergedCatalog[$key] = $value;
        }

        return $mergedCatalog;
    }

    private function loadCatalog(string $language): array {
        if (array_key_exists($language, $this->catalogs)) {
            // Retorna o catalogo ja carregado em memoria
            return $this->catalogs[$language];
        }

        // Define o arquivo de idioma a partir do codigo normalizado
        $file = $this->basePath . '/' . $language . '.json';

        if (!is_file($file)) {
            // Define catalogo vazio quando o arquivo nao existe
            $this->catalogs[$language] = [];
            return $this->catalogs[$language];
        }

        // Carrega e decodifica o catalogo JSON do idioma
        $contents = file_get_contents($file);
        $decoded = json_decode($contents ?: '{}', true);
        $this->catalogs[$language] = is_array($decoded) ? $decoded : [];

        return $this->catalogs[$language];
    }

    private function normalizeLanguage(?string $language): string {
        // Define o formato padrao dos codigos de idioma
        $normalized = strtolower(trim((string) $language));

        return $normalized !== '' ? $normalized : 'pt-br';
    }
}