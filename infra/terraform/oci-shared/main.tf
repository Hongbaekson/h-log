# The launch-owned boot volume and primary VNIC/private IP are not separate
# managed resources. Importing them twice would create overlapping ownership.
data "oci_core_boot_volume" "shared" {
  boot_volume_id = var.boot_volume_id
}

data "oci_core_private_ip" "primary" {
  private_ip_id = var.primary_private_ip_id
}

resource "oci_core_instance" "shared" {
  compartment_id      = var.compartment_id
  availability_domain = var.instance.availability_domain
  fault_domain        = var.instance.fault_domain
  shape               = var.instance.shape
  display_name        = var.resource_metadata["instance"].display_name
  defined_tags        = var.resource_metadata["instance"].defined_tags
  freeform_tags       = var.resource_metadata["instance"].freeform_tags
  metadata            = var.instance.metadata
  extended_metadata   = var.instance.extended_metadata

  shape_config {
    ocpus         = var.instance.ocpus
    memory_in_gbs = var.instance.memory_in_gbs
  }

  # Keep the original image source. Switching to bootVolume would alter the
  # imported launch contract; the existing disk is checked below instead.
  source_details {
    source_type = "image"
    source_id   = var.instance.image_id
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.shared.id
    assign_public_ip       = true
    assign_ipv6ip          = false
    display_name           = var.instance.vnic_display_name
    hostname_label         = var.instance.hostname_label
    private_ip             = var.instance.private_ip
    defined_tags           = var.instance.vnic_defined_tags
    freeform_tags          = var.instance.vnic_freeform_tags
    nsg_ids                = []
    skip_source_dest_check = false
  }

  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  launch_options {
    boot_volume_type                    = "PARAVIRTUALIZED"
    firmware                            = "UEFI_64"
    network_type                        = "PARAVIRTUALIZED"
    remote_data_volume_type             = "PARAVIRTUALIZED"
    is_pv_encryption_in_transit_enabled = true
    is_consistent_volume_naming_enabled = true
  }

  availability_config {
    recovery_action = "RESTORE_INSTANCE"
  }

  agent_config {
    are_all_plugins_disabled = false
    is_management_disabled   = false
    is_monitoring_disabled   = false

    dynamic "plugins_config" {
      for_each = var.instance.agent_plugins
      content {
        name          = plugins_config.key
        desired_state = plugins_config.value
      }
    }
  }

  lifecycle {
    prevent_destroy = true

    postcondition {
      condition     = self.boot_volume_id == data.oci_core_boot_volume.shared.id
      error_message = "The imported instance must retain the inventoried boot volume."
    }
  }
}

resource "oci_core_public_ip" "shared" {
  compartment_id = var.compartment_id
  lifetime       = "RESERVED"
  private_ip_id  = data.oci_core_private_ip.primary.id
  display_name   = var.resource_metadata["public_ip"].display_name
  defined_tags   = var.resource_metadata["public_ip"].defined_tags
  freeform_tags  = var.resource_metadata["public_ip"].freeform_tags

  lifecycle {
    prevent_destroy = true
  }
}
