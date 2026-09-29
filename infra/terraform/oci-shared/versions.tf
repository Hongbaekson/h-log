terraform {
  required_version = "= 1.16.4"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "= 9.3.0"
    }
  }

  # Backend bootstrap and state adoption are a separate, approved step.
  backend "oci" {}
}
