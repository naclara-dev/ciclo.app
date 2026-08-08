<?php

namespace App\Controllers;

use App\Core\Session;
use App\Models\Repositories\CategoryRepository;

class CategoryController extends Controller {
    public function find() {
        $this->requireAuth();

        $id = (int) ($_GET["id"] ?? 0);
        $repository = new CategoryRepository;

        $category = $repository->find([
            "id" => $id,
            "user_id" => Session::get('user_id')
        ]);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($category);
    }

    public function store() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect('manage/categories');
            exit;
        }

        $this->requireAuth();

        $data = $this->normalizeData($_POST);
        
        $repository = new CategoryRepository;
        $repository->save($data);

        redirect('manage/categories');
        exit;
    }

    public function delete() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect('manage/categories');
            exit;
        }
        
        $this->requireAuth();

        $id = (int) $_POST["id"];
        $repository = new CategoryRepository;
        $repository->delete($id, [
            'user_id' => Session::get('user_id')
        ]);

        redirect('manage/categories');
        exit;
    }    

    protected function normalizeData(array $data) {
        return [
            "id"      => empty($data["id"]) ? null : (int) $data["id"],
            "user_id" => Session::get('user_id'),
            "name"    => trim($data["name"] ?? ""),
            // Define a cor como token visual quando o formulário não envia valor
            "color"   => strtolower(trim($data["color"] ?? "var(--category-default)")),
            "icon"    => trim($data["icon"] ?? "")
        ];
    }
}
