<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Inicializa as variaveis de ambiente
$dotenv = \Dotenv\Dotenv::createImmutable(BASE_PATH);
$dotenv->safeLoad();

// Inicializa o Twig
$loader = new \Twig\Loader\FilesystemLoader(VIEWS_PATH);
$twig = new \Twig\Environment($loader, [
    'cache' => false,
    'debug' => true,
]);

// Inicializa a sessao do usuario
\App\Core\Session::start();

// Define as configuracoes globais padrao para visitantes sem sessao
$settings = [];
$language = 'pt-br';

if (\App\Core\Session::has('user_id')) {
    // Carrega as configuracoes do usuario autenticado
    $settings = (new \App\Models\Repositories\SettingRepository)->firstFromUser((int) \App\Core\Session::get('user_id')) ?: [];
    $language = $settings['language'] ?? $language;
}

// Inicializa o tradutor com fallback para portugues
$translator = new \App\Core\Translator($language, 'pt-br');

$twig->addGlobal('base_url', appBaseUrl());
$twig->addGlobal('current_path', appCurrentPath());
$twig->addGlobal('current_language', $translator->getLanguage());
$twig->addGlobal('current_translations', $translator->getCatalog());
$twig->addGlobal('user_settings', $settings);
$twig->addGlobal('dark_theme', !empty($settings['dark_theme']));

$twig->addFunction(new \Twig\TwigFunction('t', function (string $key, array $replacements = []) use ($translator): string {
    // Retorna a traducao da chave solicitada pelo template
    return $translator->translate($key, $replacements);
}));

if (\App\Core\Session::has('user_id')) {
    $twig->addGlobal('transaction_wallets', (new \App\Models\Repositories\WalletRepository)->allFromUser());
    $twig->addGlobal('transaction_categories', (new \App\Models\Repositories\CategoryRepository)->allFromUser());
    $twig->addGlobal('transaction_entities', (new \App\Models\Repositories\EntityRepository)->allFromUser());
    $twig->addGlobal('transaction_templates', (new \App\Models\Repositories\TemplateRepository)->allFromUser());
    $twig->addGlobal('transaction_payment_methods', (new \App\Models\Repositories\PaymentMethodRepository)->all());
}