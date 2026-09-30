variable "region" {
  description = "Region of the approved state bucket."
  type        = string
}

variable "compartment_id" {
  description = "Existing compartment; bootstrap does not create or modify IAM."
  type        = string
  sensitive   = true
}

variable "namespace" {
  description = "Object Storage namespace read from the existing tenancy."
  type        = string
  sensitive   = true
}

variable "bucket_name" {
  description = "Dedicated state bucket name, supplied in private inputs."
  type        = string
  sensitive   = true
}
