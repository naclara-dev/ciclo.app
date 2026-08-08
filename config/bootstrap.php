<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Initialize Dotenv
$dotenv = \Dotenv\Dotenv::createImmutable(BASE_PATH);
$dotenv->safeLoad();

// Initialize Twig
$loader = new \Twig\Loader\FilesystemLoader(VIEWS_PATH);
$twig = new \Twig\Environment($loader, [
    'cache' => false,
    'debug' => true,
]);

// Initialize Session
\App\Core\Session::start();

$twig->addGlobal('base_url', appBaseUrl());
$twig->addGlobal('current_path', appCurrentPath());

// Define as configuracoes globais padrao para visitantes sem sessao
$twig->addGlobal('user_settings', []);
$twig->addGlobal('dark_theme', false);

if (\App\Core\Session::has('user_id')) {
    // Carrega as configurações
    $settings = (new \App\Models\Repositories\SettingRepository)->firstFromUser((int) \App\Core\Session::get('user_id')) ?: [];

    $twig->addGlobal('transaction_wallets', (new \App\Models\Repositories\WalletRepository)->allFromUser());
    $twig->addGlobal('transaction_categories', (new \App\Models\Repositories\CategoryRepository)->allFromUser());
    $twig->addGlobal('transaction_entities', (new \App\Models\Repositories\EntityRepository)->allFromUser());
    $twig->addGlobal('transaction_templates', (new \App\Models\Repositories\TemplateRepository)->allFromUser());
    $twig->addGlobal('transaction_payment_methods', (new \App\Models\Repositories\PaymentMethodRepository)->all());
    $twig->addGlobal('user_settings', $settings);
    $twig->addGlobal('dark_theme', !empty($settings['dark_theme']));
}
