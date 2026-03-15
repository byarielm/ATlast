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
      <Form route="oauth.login" #default="{ processing, errors }">
        <div>
          <label for="athandle">Atmosphere Handle</label>
          <input
            type="text"
            name="input"
            id="input"
            autocomplete="username"
            palceholder="username.bsky.social"
            :data-invalid="errors.input ? 'true' : undefined"
          />
          <div v-if="errors.input">{{ errors.input }}</div>
        </div>

        <div>
          <button type="submit" class="button" :disabled="processing">Login</button>
        </div>
      </Form>
    </div>
  </div>
</template>
