resource "oci_core_vcn" "shared" {
  compartment_id = var.compartment_id
  cidr_blocks    = var.vcn.cidr_blocks
  dns_label      = var.vcn.dns_label
  is_ipv6enabled = false
  display_name   = var.resource_metadata["vcn"].display_name
  defined_tags   = var.resource_metadata["vcn"].defined_tags
  freeform_tags  = var.resource_metadata["vcn"].freeform_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "oci_core_internet_gateway" "shared" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.shared.id
  enabled        = true
  display_name   = var.resource_metadata["internet_gateway"].display_name
  defined_tags   = var.resource_metadata["internet_gateway"].defined_tags
  freeform_tags  = var.resource_metadata["internet_gateway"].freeform_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "oci_core_default_route_table" "shared" {
  manage_default_resource_id = oci_core_vcn.shared.default_route_table_id
  compartment_id             = var.compartment_id
  display_name               = var.resource_metadata["route_table"].display_name
  defined_tags               = var.resource_metadata["route_table"].defined_tags
  freeform_tags              = var.resource_metadata["route_table"].freeform_tags

  route_rules {
    destination       = var.internet_route.destination
    destination_type  = var.internet_route.destination_type
    route_type        = var.internet_route.route_type
    description       = var.internet_route.description
    network_entity_id = oci_core_internet_gateway.shared.id
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "oci_core_default_security_list" "shared" {
  manage_default_resource_id = oci_core_vcn.shared.default_security_list_id
  compartment_id             = var.compartment_id
  display_name               = var.resource_metadata["security_list"].display_name
  defined_tags               = var.resource_metadata["security_list"].defined_tags
  freeform_tags              = var.resource_metadata["security_list"].freeform_tags

  dynamic "ingress_security_rules" {
    for_each = var.ingress_rules
    content {
      protocol    = ingress_security_rules.value.protocol
      source      = ingress_security_rules.value.source
      source_type = ingress_security_rules.value.source_type
      stateless   = ingress_security_rules.value.stateless
      description = ingress_security_rules.value.description

      dynamic "icmp_options" {
        for_each = ingress_security_rules.value.icmp_options[*]
        content {
          type = icmp_options.value.type
          code = icmp_options.value.code
        }
      }

      dynamic "tcp_options" {
        for_each = ingress_security_rules.value.tcp_options[*]
        content {
          min = tcp_options.value.min
          max = tcp_options.value.max
        }
      }

      dynamic "udp_options" {
        for_each = ingress_security_rules.value.udp_options[*]
        content {
          min = udp_options.value.min
          max = udp_options.value.max
        }
      }
    }
  }

  dynamic "egress_security_rules" {
    for_each = var.egress_rules
    content {
      protocol         = egress_security_rules.value.protocol
      destination      = egress_security_rules.value.destination
      destination_type = egress_security_rules.value.destination_type
      stateless        = egress_security_rules.value.stateless
      description      = egress_security_rules.value.description
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "oci_core_default_dhcp_options" "shared" {
  manage_default_resource_id = oci_core_vcn.shared.default_dhcp_options_id
  compartment_id             = var.compartment_id
  display_name               = var.resource_metadata["dhcp_options"].display_name
  defined_tags               = var.resource_metadata["dhcp_options"].defined_tags
  freeform_tags              = var.resource_metadata["dhcp_options"].freeform_tags
  domain_name_type           = "CUSTOM_DOMAIN"

  options {
    type        = "DomainNameServer"
    server_type = "VcnLocalPlusInternet"
  }

  options {
    type                = "SearchDomain"
    search_domain_names = var.dhcp_search_domains
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "oci_core_subnet" "shared" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.shared.id
  cidr_block                 = var.subnet.cidr_block
  dns_label                  = var.subnet.dns_label
  route_table_id             = oci_core_default_route_table.shared.id
  security_list_ids          = [oci_core_default_security_list.shared.id]
  dhcp_options_id            = oci_core_default_dhcp_options.shared.id
  prohibit_public_ip_on_vnic = false
  prohibit_internet_ingress  = false
  display_name               = var.resource_metadata["subnet"].display_name
  defined_tags               = var.resource_metadata["subnet"].defined_tags
  freeform_tags              = var.resource_metadata["subnet"].freeform_tags

  lifecycle {
    prevent_destroy = true
  }
}
