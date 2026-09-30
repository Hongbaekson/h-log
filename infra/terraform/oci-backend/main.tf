terraform {
  required_version = "= 1.16.4"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "= 9.3.0"
    }
  }

  # Bootstrap must not depend on the bucket it creates. Supply a private,
  # durable local state path through an external backend configuration.
  backend "local" {}
}

provider "oci" {
  region = var.region
}

resource "oci_objectstorage_bucket" "state" {
  compartment_id = var.compartment_id
  namespace      = var.namespace
  name           = var.bucket_name
  access_type    = "NoPublicAccess"
  versioning     = "Enabled"
  storage_tier   = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}
