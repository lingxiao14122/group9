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
              :state="validateState('defectName')"
            >
            </b-form-input>

            <b-form-invalid-feedback id="input-1-live-feedback">This is a required field and only for alphabets and numbers.</b-form-invalid-feedback>
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
import { validationMixin } from "vuelidate";
import { required, maxLength, helpers } from "vuelidate/lib/validators";
const customAlphaNumValidator = helpers.regex("alphaNumAndSpace", /^[a-zA-Z0-9\ \_\-]*$/);    // eslint-disable-line

export default {
  mixins: [validationMixin],
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
  validations: {
    form: {
      defectName: {
        required,
        maxLength: maxLength(250),
        customAlphaNumValidator,
      }
    }
  },
  methods: {
    validateState(name) {
      const { $dirty, $error } = this.$v.form[name];
      return $dirty ? !$error : null;
    },
    onSubmit(event) {
      event.preventDefault();
      this.$v.form.$touch();
      if (this.$v.form.$anyError) {
        return;
      }
      
      this.showModal = false;

      window.ipc.send("INSERT_NEW_DEFECT", {defect_name: this.form.defectName,});

      this.onReset();
    },
    onReset() {
      this.form.defectName = "";

      this.$nextTick(() => {
        this.$v.$reset();
      });
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
        this.toast("Successful adding new defect category.");
      } else if (payload.result == "error") {
        this.toast("Failed adding new defect category", "error");
      } else if (payload.result == "warn") {
        this.toast(
          "Failed adding new defect category. Reason: " + payload.reason,
          "error"
        );
      }
      window.ipc.send("GET_ALL_DEFECT", {});
    });

    window.ipc.on("GET_ALL_DEFECT", (payload) => {
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