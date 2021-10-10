<template>
  <div class="defects">
    <div class="header">
      <div class="d-flex bg-header pt-5 pb-4">
        <div class="flex-column ml-5 d-flex justify-content-start">
          <h1>Defect Category</h1>
          <div class="d-flex">
            <button type="button" class="justify-content-start btn btn-primary btn-lg mt-2" @click="header_click">
              New Category
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="apptable">
      <b-table striped hover :items="items" :fields="fields">
        <template #cell(action)="row">
          <b-button size="sm" @click="click_detail_btn(row.index)"> Delete </b-button>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: [
        { key: "name", label: "Name" },
        { key: "action", label: "Action" },
      ],
      items: [{ name: "defect1" }, { name: "defect2" }],
    };
  },
  methods: {
    clickHandler() {},
    header_click() {},
  },
};
</script>

<style scoped>
.bg-header {
  background-color: rgb(182, 201, 253) ;
  /* background-color: #96fcc0 ; */
  /* background-color: #d396fc ; */
}
</style>