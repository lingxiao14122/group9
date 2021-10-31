<template>
  <div class="defects">
    <div class="header">
      <div class="d-flex bg-header pt-5 pb-4">
        <div class="flex-column ml-5 d-flex justify-content-start">
          <h1>Defect Category</h1>
          <div class="d-flex">
            <button
              type="button"
              class="justify-content-start btn btn-primary btn-lg mt-2"
              v-b-modal.modal-defect-form
            >
              New Category
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="apptable">
      <b-table striped hover :items="items" :fields="fields">
        <template #cell(action)="row">
          <b-button size="sm" @click="click_detail_btn(row.index)">
            Delete
          </b-button>
        </template>
      </b-table>
    </div>
    <div class="appmodal">
      <b-modal
        v-model="showModal"
        id="modal-defect-form"
        title="New Defect Category"
      >
        <b-form id="b-form-1" @submit="onSubmit" @reset="onReset">
          <b-form-group
            id="input-group-1"
            label="Defect Name:"
            label-for="input-1"
          >
            <b-form-input
              id="input-1"
              v-model="form.defectName"
              placeholder="Enter defect name"
              required
            >
            </b-form-input>
          </b-form-group>
        </b-form>
        <template #modal-footer>
          <b-button type="reset" form="b-form-1">Reset</b-button>
          <b-button type="submit" form="b-form-1" variant="primary"
            >Submit</b-button
          >
        </template>
      </b-modal>
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
      items: [],
      form: {
        defectName: "",
      },
      showModal: false,
    };
  },
  methods: {
    onSubmit(event) {
      event.preventDefault();
      this.showModal = false;
      // alert(JSON.stringify(this.form));
      //this.items.push({name: this.form.defectName})

      window.ipc.send("INSERT_NEW_DEFECT", {
        defect_name: this.form.defectName,
      });

      this.onReset();
    },
    onReset() {
      this.form.defectName = "";
    },
    click_detail_btn(index) {
      if (confirm("Are you sure want to delete this defect category?")) {
        window.ipc.send("DELETE_DEFECT", { _id: this.items[index]._id });
      }
    },
  },
  mounted() {
    window.ipc.on("INSERT_NEW_DEFECT", (payload) => {
      if (payload.result == "success") {
        this.toast("Successful adding defect category.");
      } else if (payload.result == "error") {
        this.toast("Failed adding defect category", "error");
      } else if (payload.result == "warn") {
        this.toast(
          "Failed adding defect category. Reason: " + payload.reason,
          "error"
        );
      }
      window.ipc.send("GET_ALL_DEFECT", {});
    });

    window.ipc.on("GET_ALL_DEFECT", (payload) => {
      console.log(payload);
      if (payload.result == "success") {
        this.items = payload.items;
      } else if (payload.result == "error") {
        this.toast("Failed getting all defect categories.", "error");
        this.items = [];
      }
    });

    window.ipc.on("DELETE_DEFECT", (payload) => {
      if (payload.result == "success") {
        this.toast("Successful deleting defect category.");
      } else if (payload.result == "error") {
        if (payload.code == 1) {
          this.toast("Failed deleting defect category. Reason: " + payload.reason, "error");
        } else {
          this.toast("Failed deleting defect category.", "error");
        }
      }
      window.ipc.send("GET_ALL_DEFECT", {});
    });

    window.ipc.send("GET_ALL_DEFECT", {});
  },
  beforeDestroy() {
    let activeChannel = ["INSERT_NEW_DEFECT", "GET_DEFECT", "DELETE_DEFECT"];
    window.ipc.removeAllListeners(activeChannel);
  },
};
</script>

<style scoped>
.bg-header {
  background-color: rgb(182, 201, 253);
}
</style>