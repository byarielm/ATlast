<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
</script>

<template>
  <div class="form-container">
    <div>
      <h1>Login</h1>
      <p>Enter your details below to login to your account</p>
    </div>

    <div>
      <Form route="session.store" #default="{ processing, errors }">
        <div>
          <label for="email">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            autocomplete="username"
            :data-invalid="errors.email ? 'true' : undefined"
          />
          <div v-if="errors.email">{{ errors.email }}</div>
        </div>

        <div>
          <label for="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            autocomplete="current-password"
            :data-invalid="errors.password ? 'true' : undefined"
          />
          <div v-if="errors.password">{{ errors.password }}</div>
        </div>

        <div>
          <button type="submit" class="button" :disabled="processing">Login</button>
        </div>
      </Form>
    </div>
  </div>
</template>
