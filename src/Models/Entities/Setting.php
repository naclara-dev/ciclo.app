<?php

namespace App\Models\Entities;

class Setting
{
    private $id = null;
    private $userId = null;
    private $defaultPaymentMethodId = null;
    private $defaultWalletId = null;
    private $defaultEntityId = null;
    private $defaultType = null;
    private $cycleStartsAfterIncome = null;
    private $darkTheme = null;
    private $language = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): void
    {
        $this->id = $id;
    }

    public function getUserId(): ?int
    {
        return $this->userId;
    }

    public function setUserId(?int $userId): void
    {
        $this->userId = $userId;
    }

    public function getDefaultPaymentMethodId(): ?int
    {
        return $this->defaultPaymentMethodId;
    }

    public function setDefaultPaymentMethodId(?int $defaultPaymentMethodId): void
    {
        $this->defaultPaymentMethodId = $defaultPaymentMethodId;
    }

    public function getDefaultWalletId(): ?int
    {
        return $this->defaultWalletId;
    }

    public function setDefaultWalletId(?int $defaultWalletId): void
    {
        $this->defaultWalletId = $defaultWalletId;
    }

    public function getDefaultEntityId(): ?int
    {
        return $this->defaultEntityId;
    }

    public function setDefaultEntityId(?int $defaultEntityId): void
    {
        $this->defaultEntityId = $defaultEntityId;
    }

    public function getDefaultType(): ?string
    {
        return $this->defaultType;
    }

    public function setDefaultType(?string $defaultType): void
    {
        $this->defaultType = $defaultType;
    }

    public function getCycleStartsAfterIncome(): ?bool
    {
        return $this->cycleStartsAfterIncome;
    }

    public function setCycleStartsAfterIncome(?bool $cycleStartsAfterIncome): void
    {
        $this->cycleStartsAfterIncome = $cycleStartsAfterIncome;
    }
    public function getDarkTheme(): ?bool
    {
        return $this->darkTheme;
    }

    public function setDarkTheme(?bool $darkTheme): void
    {
        $this->darkTheme = $darkTheme;
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }

    public function setLanguage(?string $language): void
    {
        $this->language = $language;
    }
}
