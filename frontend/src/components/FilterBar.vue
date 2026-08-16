<script setup>

defineProps({
  status: {
    type: String,
    default: 'all'
  },

  priority: {
    type: String,
    default: 'all'
  },

  type: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits([
  'update:status',
  'update:priority',
  'update:type',
  'reset'
])

const statuses = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['accepted', 'Accepted'],
  ['resolved', 'Resolved']
]

const priorities = [
  ['all', 'All priorities'],
  ['Critical', 'Critical'],
  ['Medium', 'Medium'],
  ['Low', 'Low']
]

const types = [
  ['all', 'All types'],
  ['Water', '💧 Water'],
  ['Medical', '🏥 Medical'],
  ['Food', '🍱 Food'],
  ['Rescue', '🛟 Rescue'],
  ['Shelter', '🏠 Shelter'],
  ['Power', '⚡ Power']
]

</script>

<template>

  <section class="filter-bar">

    <div class="filter-group">

      <label>Status</label>

      <select
        :value="status"
        @change="
          emit(
            'update:status',
            $event.target.value
          )
        "
      >

        <option
          v-for="item in statuses"
          :key="item[0]"
          :value="item[0]"
        >
          {{ item[1] }}
        </option>

      </select>

    </div>


    <div class="filter-group">

      <label>Priority</label>

      <select
        :value="priority"
        @change="
          emit(
            'update:priority',
            $event.target.value
          )
        "
      >

        <option
          v-for="item in priorities"
          :key="item[0]"
          :value="item[0]"
        >
          {{ item[1] }}
        </option>

      </select>

    </div>


    <div class="filter-group">

      <label>Help type</label>

      <select
        :value="type"
        @change="
          emit(
            'update:type',
            $event.target.value
          )
        "
      >

        <option
          v-for="item in types"
          :key="item[0]"
          :value="item[0]"
        >
          {{ item[1] }}
        </option>

      </select>

    </div>


    <button
      class="reset-button"
      @click="emit('reset')"
    >
      ↻ Reset
    </button>

  </section>

</template>

<style scoped>

.filter-bar {
  display: flex;

  align-items: flex-end;

  gap: 10px;

  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 12px;

  padding: 13px;

  margin-bottom: 12px;
}

.filter-group {
  flex: 1;

  display: flex;

  flex-direction: column;

  gap: 5px;
}

.filter-group label {
  font-size: 11px;

  font-weight: 600;

  color: #6b7280;
}

.filter-group select {
  width: 100%;

  height: 36px;

  border:
    1px solid #d1d5db;

  border-radius: 8px;

  padding: 0 9px;

  background: white;

  color: #374151;

  font-size: 12px;

  outline: none;
}

.filter-group select:focus {
  border-color: #ef4444;
}

.reset-button {
  height: 36px;

  border:
    1px solid #e5e7eb;

  background: #f9fafb;

  padding: 0 12px;

  border-radius: 8px;

  color: #374151;

  font-size: 12px;

  font-weight: 600;
}

.reset-button:hover {
  background: #f3f4f6;
}

@media (max-width: 700px) {

  .filter-bar {
    flex-wrap: wrap;
  }

  .filter-group {
    min-width: 140px;
  }

}

@media (max-width: 500px) {

  .filter-bar {
    flex-direction: column;

    align-items: stretch;
  }

}

</style>